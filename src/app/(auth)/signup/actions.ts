'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { signupSchema } from '@/lib/validators/auth'
import {
  COMMUNITY_RULES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/constants/interests'
import { getRequestIp, getSiteOrigin } from '@/lib/utils'
import { sendGuestSignupConfirmEmail } from '@/lib/email/signup-confirmation'

export type SignupState = { error: string | null }

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    username: formData.get('username'),
    accept: formData.get('accept') === 'on',
    accept_community_rules: formData.get('accept_community_rules') === 'on',
    confirm_18: formData.get('confirm_18') === 'on',
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? 'Invalid input'
    console.warn('[guest-signup] schema validation failed:', first)
    return { error: first }
  }
  const { email, password, username } = parsed.data

  console.log(`[guest-signup] action invoked for ${email}`)

  const headerList = await headers()
  const origin = getSiteOrigin(headerList)
  const admin = createSupabaseAdminClient()

  // generateLink({ type: 'signup' }) creates the auth.users row + returns the
  // confirmation URL without sending Supabase's global confirmation email.
  // We then send our branded guest-flavored email via Resend.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: { username },
      redirectTo: `${origin}/auth/confirm`,
    },
  })
  if (linkError) {
    console.error(`[guest-signup] generateLink failed for ${email}:`, linkError.message)
    return { error: linkError.message }
  }
  const confirmUrl = linkData.properties?.action_link
  const userId = linkData.user?.id
  if (!confirmUrl || !userId) {
    console.error(`[guest-signup] generateLink returned no link/user for ${email}`)
    return { error: 'Signup failed.' }
  }
  console.log(
    `[guest-signup] generateLink ok for ${email} (user=${userId}, link.host=${new URL(confirmUrl).host})`,
  )

  // Legal ack — service-role insert so it lands regardless of session state.
  // Records the explicit consent flags (age_confirmed / accepted_terms /
  // accepted_rules) alongside the version strings, plus request metadata.
  // The form's required checkboxes + zod schema both gate submission, so
  // anything that reaches this insert has affirmatively consented.
  const { error: ackError } = await admin.from('legal_acks').insert({
    user_id: userId,
    age_confirmed: true,
    accepted_terms: true,
    accepted_rules: true,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    community_rules_version: COMMUNITY_RULES_VERSION,
    ip_address: getRequestIp(headerList),
    user_agent: headerList.get('user-agent'),
  })
  if (ackError) {
    console.error('legal_acks insert failed:', ackError.message)
  }

  // Custom branded confirmation email.
  console.log(`[guest-signup] calling sendGuestSignupConfirmEmail for ${email}`)
  const sent = await sendGuestSignupConfirmEmail({ toEmail: email, confirmUrl })
  if (!sent.ok) {
    console.error('[guest-signup] confirmation email failed:', sent.error)
    return {
      error:
        "Account created but we couldn't send the confirmation email. Try requesting a new one from the verify page.",
    }
  }
  console.log(
    `[guest-signup] confirmation email sent ok for ${email} (resend id=${sent.id ?? 'unknown'})`,
  )

  redirect(`/verify?email=${encodeURIComponent(email)}`)
}

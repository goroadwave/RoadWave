'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signupSchema } from '@/lib/validators/auth'
import {
  COMMUNITY_RULES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/constants/interests'
import { getRequestIp, getSiteOrigin } from '@/lib/utils'

export type SignupState = { error: string | null }

// Camper signup. Two pieces of work:
//
//   1. supabase.auth.signUp() — creates the auth.users row AND triggers
//      Supabase to send the confirmation email through Custom SMTP
//      (Resend, configured in Supabase Authentication → SMTP). No call
//      to our own Resend SDK here — Supabase handles delivery end to
//      end. Customize the email body in Supabase Authentication →
//      Email Templates → Confirm signup.
//
//   2. legal_acks insert — service-role write so the consent row lands
//      regardless of session state. Required for /consent/legal gating
//      in (app) and /owner/(authed) layouts.
//
// On success the user is redirected to /verify with their email; the
// confirmation link in the email lands on /auth/confirm, which marks
// email_confirmed_at and routes them onward.
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
  const supabase = await createSupabaseServerClient()
  const admin = createSupabaseAdminClient()

  // 1. signUp() — creates the auth.users row + Supabase sends the
  //    confirmation email via Custom SMTP (Resend).
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  })
  if (signUpError) {
    console.error(
      `[guest-signup] signUp failed for ${email}:`,
      signUpError.message,
    )
    return { error: signUpError.message }
  }
  const userId = data.user?.id
  if (!userId) {
    // Supabase returns user=null when the email already exists and is
    // confirmed (intentional — prevents email enumeration). The signup
    // form should treat this as success-ish; route the user to /verify
    // where they can resend if needed.
    console.warn(
      `[guest-signup] signUp returned no user for ${email} (likely already-confirmed account)`,
    )
    redirect(`/verify?email=${encodeURIComponent(email)}`)
  }
  console.log(`[guest-signup] signUp ok for ${email} (user=${userId})`)

  // 2. Legal ack — service-role insert so it lands regardless of
  //    session state. Records the explicit consent flags
  //    (age_confirmed / accepted_terms / accepted_rules) alongside the
  //    version strings, plus request metadata. The form's required
  //    checkboxes + zod schema both gate submission, so anything that
  //    reaches this insert has affirmatively consented.
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

  redirect(`/verify?email=${encodeURIComponent(email)}`)
}

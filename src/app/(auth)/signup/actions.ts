'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { signupSchema } from '@/lib/validators/auth'
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/constants/interests'
import { getRequestIp } from '@/lib/utils'

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
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? 'Invalid input'
    return { error: first }
  }
  const { email, password, username } = parsed.data

  const supabase = await createSupabaseServerClient()
  const headerList = await headers()
  const origin =
    headerList.get('origin') ??
    (headerList.get('host') ? `http://${headerList.get('host')}` : 'http://localhost:3000')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Signup failed.' }

  // No session yet (email confirmation pending) — write the legal ack with
  // the service-role client so the row lands regardless.
  const admin = createSupabaseAdminClient()
  const { error: ackError } = await admin.from('legal_acks').insert({
    user_id: data.user.id,
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    ip_address: getRequestIp(headerList),
    user_agent: headerList.get('user-agent'),
  })
  if (ackError) {
    // Non-fatal for the user but worth knowing about.
    console.error('legal_acks insert failed:', ackError.message)
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`)
}

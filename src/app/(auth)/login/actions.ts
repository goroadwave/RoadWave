'use server'

import { redirect } from 'next/navigation'
import { getPostAuthDestination } from '@/lib/auth/post-auth-destination'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/validators/auth'

export type LoginState = { error: string | null }

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? 'Invalid input'
    return { error: first }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) return { error: error?.message ?? 'Could not sign in.' }

  // Route by role + admin membership — owners go straight to the
  // dashboard, guests to /home. Same helper is used by /owner/login
  // and the OAuth callback so the destination is consistent across
  // every entry point.
  const dest = await getPostAuthDestination(supabase, data.user.id, '/home')
  redirect(dest)
}

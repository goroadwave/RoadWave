'use server'

import { redirect } from 'next/navigation'
import { safeRedirectNext } from '@/lib/auth/intended-next'
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

  // Honor an explicit ?next= the (app) layout (or the login page itself)
  // threaded through. A signed-out camper who tapped a shared /waves
  // link, got bounced to /login?next=/waves, then signed in below must
  // land back on /waves -- not on /home or the campground hub. The
  // role-based override below still wins for owners/admins because they
  // never belong on a guest route; the explicit-next path applies only
  // to the guest fallback.
  const explicitNext = safeRedirectNext(formData.get('next'))
  const dest = await getPostAuthDestination(
    supabase,
    data.user.id,
    explicitNext ?? '/home',
  )
  redirect(dest)
}

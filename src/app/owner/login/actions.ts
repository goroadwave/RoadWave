'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getPostAuthDestination } from '@/lib/auth/post-auth-destination'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type OwnerLoginState = { error: string | null }

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
})

export async function ownerLoginAction(
  _prev: OwnerLoginState,
  formData: FormData,
): Promise<OwnerLoginState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Enter your email and password.' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || !data.user) return { error: error?.message ?? 'Could not sign in.' }

  // Route by role + admin membership. /owner/login is the owner
  // entry point but we still consult the same helper so a guest who
  // happens to sign in here doesn't get marooned on /owner — they
  // get routed to /home like any other guest. The /owner index page
  // (next-step destination for genuine owners) handles the
  // setup-needed → /owner/setup branch on its own.
  const dest = await getPostAuthDestination(supabase, data.user.id, '/home')
  redirect(dest)
}

'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
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

  redirect('/owner')
}

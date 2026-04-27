'use server'

import { redirect } from 'next/navigation'
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  redirect('/')
}

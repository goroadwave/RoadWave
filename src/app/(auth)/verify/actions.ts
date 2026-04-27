'use server'

import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resendSchema } from '@/lib/validators/auth'

export type ResendState = { error: string | null; ok: boolean }

export async function resendAction(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const parsed = resendSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { error: 'Enter a valid email address.', ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const headerList = await headers()
  const origin =
    headerList.get('origin') ??
    (headerList.get('host') ? `http://${headerList.get('host')}` : 'http://localhost:3000')

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { error: error.message, ok: false }

  return { error: null, ok: true }
}

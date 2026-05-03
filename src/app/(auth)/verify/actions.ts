'use server'

import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resendSchema } from '@/lib/validators/auth'
import { getSiteOrigin } from '@/lib/utils'

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
  const origin = getSiteOrigin(headerList)

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  })
  if (error) return { error: error.message, ok: false }

  return { error: null, ok: true }
}

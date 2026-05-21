'use server'

import { headers } from 'next/headers'
import { safeRedirectNext } from '@/lib/auth/intended-next'
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

  // Preserve the intended destination across the resend round trip so a
  // camper who arrived via /signup?next=/waves keeps that destination
  // even when the original confirmation email expires and they ask for
  // a fresh one.
  const explicitNext = safeRedirectNext(formData.get('next'))
  const confirmUrl = new URL('/auth/confirm', origin)
  if (explicitNext) confirmUrl.searchParams.set('next', explicitNext)

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: confirmUrl.toString() },
  })
  if (error) return { error: error.message, ok: false }

  return { error: null, ok: true }
}

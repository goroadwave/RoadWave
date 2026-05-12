'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Server action backing the "Sign in to RoadWave" form on
// /auth/sign-in. The form posts a token_hash from the URL that was
// emailed to the owner.
//
// Why this lives behind a form submit instead of a plain GET:
//
//   Gmail / Outlook / a handful of corporate mail gateways prefetch
//   every URL in incoming emails to scan for malware. That prefetch
//   makes a GET request, follows redirects, and any one-time-use OTP
//   embedded in the link gets consumed before the human ever clicks.
//   The visible symptom is the user landing on an "otp_expired" error
//   page even though the link "just arrived."
//
//   Routing through a form POST defeats that scanner — the email
//   contains a link to the /auth/sign-in PAGE (which renders harmless
//   HTML), and the OTP is only verified when the human actually
//   submits the form. Scanners don't submit forms.
//
// The OTP payload is the `token_hash` returned by
// admin.auth.admin.generateLink — the URL-safe hashed form of the
// magic-link token. We pass it to supabase.auth.verifyOtp which mints
// the session.

const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{16,512}$/

export type VerifyMagicLinkState = {
  error: string | null
}

export async function verifyMagicLinkAction(
  _prev: VerifyMagicLinkState,
  formData: FormData,
): Promise<VerifyMagicLinkState> {
  const rawTh = formData.get('th')
  const rawNext = formData.get('next')
  const tokenHash = typeof rawTh === 'string' ? rawTh : ''
  const next =
    typeof rawNext === 'string' && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/owner/dashboard'

  if (!TOKEN_HASH_RE.test(tokenHash)) {
    return { error: 'Missing or malformed sign-in token. Use a fresh link.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })

  if (error) {
    console.warn('[auth/sign-in] verifyOtp failed:', error.message)
    // Don't echo the raw error back — Supabase's wording is internal
    // ("Token has expired or is invalid"). Route the user back to
    // this same page with a banner that explains what to do.
    redirect('/auth/sign-in?error=expired')
  }

  // verifyOtp on success has already set the auth cookies via the
  // Supabase server client. (authed) layout for /owner/* checks
  // legal_acks and routes through /consent if missing, so we don't
  // need to handle that here — just redirect to the intended next.
  redirect(next)
}

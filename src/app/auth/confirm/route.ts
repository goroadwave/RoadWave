import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { postAuthRedirectResponse } from '@/lib/auth/post-auth-redirect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Email confirmation handler. Newer Supabase email templates (and our
// branded resend flow) send users to:
//   https://www.getroadwave.com/auth/confirm?token_hash=...&type=signup
//
// Some email clients (Outlook Safe Links, certain mobile clients,
// HTML→plain-text conversions) mangle the `&` between query params and
// drop the trailing `&type=signup` portion of the URL. The previous
// /auth/callback handler required both token_hash AND type to be
// present, so a mangled link bounced the user back to /login with
// "Missing verification token" even though the token itself was intact.
//
// /auth/confirm is more lenient: if `type` is missing but `token_hash`
// is present, default `type` to 'signup' (the only flow that uses this
// URL) and proceed. Anything else routes to /login with the specific
// error so the user sees something actionable.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const typeParam = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Supabase rejected the link upstream and bounced back with error info.
  const upstreamError = searchParams.get('error_description')
  if (upstreamError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(upstreamError)}`, origin),
    )
  }

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL('/login?error=Missing+verification+token', origin),
    )
  }

  // Default to 'signup' when the email client stripped the &type=…
  // portion. This route is only used by email-confirmation links, so
  // 'signup' is the correct fallback for that surface.
  const type: EmailOtpType =
    (typeParam as EmailOtpType | null) ?? ('signup' as EmailOtpType)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
    )
  }

  return await postAuthRedirectResponse(request, supabase, origin, next)
}

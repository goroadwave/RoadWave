import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Supabase email-confirmation links land here. Two link formats supported:
//   * ?code=...                   (PKCE, newer Supabase email templates)
//   * ?token_hash=...&type=...    (magic link / email OTP)
//
// Supabase may also bounce back with ?error=...&error_description=... when
// it rejects the link before it ever hits us (most often: the redirect URL
// isn't on the allow-list, or the link expired).
//
// On success → redirect to the next destination (default /).
// On any failure → redirect to /login with the actual error surfaced as a
// query param so the user sees what's wrong.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  // Supabase rejected the link upstream and bounced back with error info.
  const upstreamError = searchParams.get('error_description')
  if (upstreamError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(upstreamError)}`, origin),
    )
  }

  const supabase = await createSupabaseServerClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(await consentOrNextUrl(supabase, origin, next))
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
    )
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })
    if (!error) {
      return NextResponse.redirect(await consentOrNextUrl(supabase, origin, next))
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
    )
  }

  return NextResponse.redirect(
    new URL('/login?error=Missing+verification+token', origin),
  )
}

// After a successful auth exchange / verify, route the user through the
// consent screen if they have NEVER recorded a legal_acks row. Email
// signups always have a row (signupAction writes one), so they pass
// straight through. First-time OAuth users land on /consent with the
// original `next` preserved.
async function consentOrNextUrl(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  origin: string,
  next: string,
): Promise<URL> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new URL(next, origin)

  // Use the admin client for this read so we don't depend on the user's
  // RLS context immediately after exchange — RLS allows SELECT on
  // legal_acks_select_own anyway, but admin keeps the check robust.
  const admin = createSupabaseAdminClient()
  const { data: existing } = await admin
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) return new URL(next, origin)

  // No consent on file — gate with /consent and preserve next.
  const consentUrl = new URL('/consent', origin)
  consentUrl.searchParams.set('next', next)
  return consentUrl
}


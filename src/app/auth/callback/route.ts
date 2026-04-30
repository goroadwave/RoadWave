import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  CONSENT_INTENT_COOKIE,
  parseConsentIntent,
} from '@/lib/auth/consent-intent'
import {
  COMMUNITY_RULES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/constants/interests'
import { getRequestIp } from '@/lib/utils'

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
      return await consentOrNextResponse(request, supabase, origin, next)
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
      return await consentOrNextResponse(request, supabase, origin, next)
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
    )
  }

  return NextResponse.redirect(
    new URL('/login?error=Missing+verification+token', origin),
  )
}

// After a successful auth exchange / verify, route the user.
//
// Order of operations:
//   1. If a legal_acks row already exists for this user → straight to
//      `next`. (Email signups land their row at /signup time; returning
//      OAuth users land theirs from a previous /consent acceptance.)
//   2. Else if a valid consent-intent cookie is present → write the
//      legal_acks row server-side using the cookie's claim, clear the
//      cookie, and proceed to `next`. This is the path triggered by
//      checking the three boxes on /signup before clicking Google —
//      it eliminates the duplicate /consent screen.
//   3. Else → /consent?next=<original> for explicit confirmation.
async function consentOrNextResponse(
  request: NextRequest,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  origin: string,
  next: string,
): Promise<NextResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(next, origin))

  const admin = createSupabaseAdminClient()
  const { data: existing } = await admin
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) return NextResponse.redirect(new URL(next, origin))

  // No legal_acks row yet. Try the consent-intent cookie set by the
  // signup page before OAuth.
  const intent = parseConsentIntent(
    request.cookies.get(CONSENT_INTENT_COOKIE)?.value,
  )
  if (intent) {
    const headerList = request.headers
    const { error: ackError } = await admin.from('legal_acks').insert({
      user_id: user.id,
      age_confirmed: true,
      accepted_terms: true,
      accepted_rules: true,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      community_rules_version: COMMUNITY_RULES_VERSION,
      ip_address: getRequestIp(headerList),
      user_agent: headerList.get('user-agent'),
    })
    if (!ackError) {
      // Consent recorded — proceed to next, and clear the cookie so it
      // can't be reused by a later session.
      const response = NextResponse.redirect(new URL(next, origin))
      response.cookies.delete(CONSENT_INTENT_COOKIE)
      return response
    }
    console.error(
      '[auth/callback] consent-intent legal_acks insert failed:',
      ackError.message,
    )
    // Fall through to /consent so the user has a manual path.
  }

  // No consent on file and no usable intent — gate with /consent.
  const consentUrl = new URL('/consent', origin)
  consentUrl.searchParams.set('next', next)
  const response = NextResponse.redirect(consentUrl)
  // Clear any stale intent cookie on this path too.
  response.cookies.delete(CONSENT_INTENT_COOKIE)
  return response
}


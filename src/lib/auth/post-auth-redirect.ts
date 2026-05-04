import { type NextRequest, NextResponse } from 'next/server'
import {
  CONSENT_INTENT_COOKIE,
  parseConsentIntent,
} from '@/lib/auth/consent-intent'
import {
  COMMUNITY_RULES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/constants/interests'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRequestIp } from '@/lib/utils'

// Window for "this is a fresh signup" detection. Anything older than
// this and the user has clearly come back later — they're just signing
// in, not signing up for the first time. 5 min covers normal latency
// between user creation and the auth callback even on slow networks.
const FRESH_SIGNUP_WINDOW_MS = 5 * 60 * 1000

// Shared helper used after a successful auth exchange / verifyOtp call.
// Routes the user to:
//   1. `next` directly if a legal_acks row already exists.
//   2. `next` after writing legal_acks server-side from a consent-intent
//      cookie (set by /signup before kicking off OAuth).
//   3. /consent?next=<original> for explicit confirmation otherwise.
//
// Lives in src/lib/auth/ so /auth/callback (OAuth + email) and
// /auth/confirm (email-only) can both call it without duplicating.
export async function postAuthRedirectResponse(
  request: NextRequest,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  origin: string,
  next: string,
): Promise<NextResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(next, origin))

  // First-signup welcome email. Fires on the moment of email
  // verification regardless of provider:
  //   * Google OAuth — the OAuth callback IS the verification (Google
  //     attests to the email, Supabase populates email_confirmed_at).
  //   * Email + password — verification happens when the user clicks
  //     the confirmation link and /auth/confirm runs verifyOtp(),
  //     which sets email_confirmed_at at that moment.
  //
  // Gate is "email_confirmed_at within FRESH_SIGNUP_WINDOW_MS." Repeat
  // sign-ins skip naturally because email_confirmed_at stops updating
  // after the first verification — a returning user's timestamp is
  // hours/days old.
  //
  // Sits ABOVE the existing legal_acks short-circuit because for
  // email/password users the legal_acks row already exists by the
  // time they click the confirmation link (it's written in /signup
  // action right after auth.signUp succeeds). Below the short-circuit
  // would never fire for that flow.
  //
  // Send is fire-and-forget — the welcome email is non-essential, and
  // we never want a Resend outage to block the user's auth flow.
  if (isFreshSignup(user)) {
    const homeUrl = `${origin}/home`
    sendWelcomeEmail({
      toEmail: user.email ?? '',
      fullName:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
      homeUrl,
    })
      .then((result) => {
        if (!result.ok) {
          console.warn(
            `[post-auth-redirect] welcome email failed for ${user.email}: ${result.error}`,
          )
        } else {
          console.log(
            `[post-auth-redirect] welcome email sent to ${user.email} (resend id=${result.id ?? 'unknown'})`,
          )
        }
      })
      .catch((err: unknown) => {
        console.warn(
          '[post-auth-redirect] welcome email threw:',
          err instanceof Error ? err.message : String(err),
        )
      })
  }

  const admin = createSupabaseAdminClient()
  const { data: existing } = await admin
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) return NextResponse.redirect(new URL(next, origin))

  const intent = parseConsentIntent(
    request.cookies.get(CONSENT_INTENT_COOKIE)?.value,
  )
  if (intent) {
    const headerList = request.headers
    // Per-field consent timestamps mirror the email/password signup
    // path (see 0036_consent_per_field_timestamps.sql). All four are
    // set to `now` because the user gave every consent simultaneously
    // by checking all three boxes before the OAuth click.
    const consentNow = new Date().toISOString()
    const { error: ackError } = await admin.from('legal_acks').insert({
      user_id: user.id,
      age_confirmed: true,
      accepted_terms: true,
      accepted_rules: true,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      community_rules_version: COMMUNITY_RULES_VERSION,
      confirmed_18_at: consentNow,
      accepted_terms_at: consentNow,
      accepted_privacy_at: consentNow,
      accepted_community_rules_at: consentNow,
      ip_address: getRequestIp(headerList),
      user_agent: headerList.get('user-agent'),
    })
    if (!ackError) {
      const response = NextResponse.redirect(new URL(next, origin))
      response.cookies.delete(CONSENT_INTENT_COOKIE)
      return response
    }
    console.error(
      '[post-auth-redirect] consent-intent legal_acks insert failed:',
      ackError.message,
    )
    // Fall through to /consent so the user has a manual path.
  }

  const consentUrl = new URL('/consent', origin)
  consentUrl.searchParams.set('next', next)
  const response = NextResponse.redirect(consentUrl)
  response.cookies.delete(CONSENT_INTENT_COOKIE)
  return response
}

// Detect "this user just verified their email for the first time."
// Works for both providers — Google OAuth users get email_confirmed_at
// set to the OAuth callback moment (Google attests), email/password
// users get it set when they click the confirmation link. Returning
// sign-ins have an old email_confirmed_at, so they fall outside the
// window and we skip.
function isFreshSignup(user: {
  email?: string | null
  email_confirmed_at?: string | null
}): boolean {
  if (!user.email) return false
  if (!user.email_confirmed_at) return false
  const ageMs = Date.now() - new Date(user.email_confirmed_at).getTime()
  return ageMs <= FRESH_SIGNUP_WINDOW_MS
}

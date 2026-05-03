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
import { sendGoogleWelcomeEmail } from '@/lib/email/google-welcome'
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

  const admin = createSupabaseAdminClient()
  const { data: existing } = await admin
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) return NextResponse.redirect(new URL(next, origin))

  // First-time-Google-OAuth welcome email. Three gates that must all
  // pass for the email to fire:
  //   1. user.identities[] contains a 'google' provider entry
  //   2. user.created_at is within the last FRESH_SIGNUP_WINDOW_MS
  //      (so a returning Google user who hasn't completed /consent yet
  //       doesn't trigger duplicate sends)
  //   3. legal_acks doesn't exist yet (the `existing` check above)
  // Repeat OAuth logins after consent skip this entire block because
  // they short-circuit at the `existing` check above.
  //
  // Send is fire-and-forget on the failure path — the welcome email
  // is non-essential, and we never want a Resend outage to block the
  // user's auth flow.
  if (isFreshGoogleSignup(user)) {
    const homeUrl = `${origin}/home`
    sendGoogleWelcomeEmail({
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
            `[post-auth-redirect] google welcome email failed for ${user.email}: ${result.error}`,
          )
        } else {
          console.log(
            `[post-auth-redirect] google welcome email sent to ${user.email} (resend id=${result.id ?? 'unknown'})`,
          )
        }
      })
      .catch((err: unknown) => {
        console.warn(
          '[post-auth-redirect] google welcome email threw:',
          err instanceof Error ? err.message : String(err),
        )
      })
  }

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

// Detect "this user just completed their first Google OAuth signup."
// Required for the welcome email gate — repeat sign-ins via Google are
// not signup events and shouldn't trigger another welcome.
function isFreshGoogleSignup(user: {
  email?: string | null
  created_at?: string
  identities?:
    | Array<{ provider?: string | null }>
    | null
}): boolean {
  if (!user.email) return false
  if (!user.created_at) return false
  const ageMs = Date.now() - new Date(user.created_at).getTime()
  if (ageMs > FRESH_SIGNUP_WINDOW_MS) return false
  const hasGoogle = (user.identities ?? []).some(
    (i) => i?.provider === 'google',
  )
  return hasGoogle
}

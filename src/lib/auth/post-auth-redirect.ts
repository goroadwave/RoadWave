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
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRequestIp } from '@/lib/utils'

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

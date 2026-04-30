'use server'

import { cookies } from 'next/headers'
import {
  CONSENT_INTENT_COOKIE,
  CONSENT_INTENT_TTL_SECONDS,
  buildConsentIntent,
  serializeConsentIntent,
} from '@/lib/auth/consent-intent'

// Called from the signup page right before kicking off Google OAuth.
// Records the visitor's "I checked all three boxes" state in a short-
// lived HTTP-only cookie so /auth/callback can write legal_acks and
// skip the duplicate /consent screen on return.
export async function recordOAuthConsentIntentAction() {
  const cookieStore = await cookies()
  cookieStore.set(
    CONSENT_INTENT_COOKIE,
    serializeConsentIntent(buildConsentIntent()),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: CONSENT_INTENT_TTL_SECONDS,
    },
  )
}

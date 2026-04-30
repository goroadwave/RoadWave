// Helpers for the consent-intent cookie that bridges the signup-page
// checkboxes and the /auth/callback handler. When a visitor checks the
// three required consent boxes on /signup and clicks "Continue with
// Google", we set this cookie before the OAuth redirect. The callback
// then reads + validates the cookie and writes the legal_acks row,
// allowing the /consent screen to be skipped — they already consented.
//
// The cookie is HttpOnly + Secure (in production) + SameSite=Lax so it
// survives the cross-site OAuth round trip. Payload is opaque JSON
// with a version + timestamp + the three flags. Tampering is a
// non-issue: setting the cookie merely lets the holder skip the /consent
// UI; the legal_acks record reflects whatever the cookie claims, and a
// user faking it has effectively self-consented (which is what they
// would have done on /consent anyway).

export const CONSENT_INTENT_COOKIE = 'roadwave_consent_intent'
export const CONSENT_INTENT_TTL_SECONDS = 600 // 10 minutes

export type ConsentIntent = {
  v: 1
  ts: number
  age: true
  terms: true
  rules: true
}

export function buildConsentIntent(): ConsentIntent {
  return {
    v: 1,
    ts: Date.now(),
    age: true,
    terms: true,
    rules: true,
  }
}

export function serializeConsentIntent(intent: ConsentIntent): string {
  return JSON.stringify(intent)
}

export function parseConsentIntent(raw: string | undefined | null): ConsentIntent | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw) as Partial<ConsentIntent>
    if (obj.v !== 1) return null
    if (typeof obj.ts !== 'number') return null
    if (Date.now() - obj.ts > CONSENT_INTENT_TTL_SECONDS * 1000) return null
    if (obj.age !== true || obj.terms !== true || obj.rules !== true) return null
    return obj as ConsentIntent
  } catch {
    return null
  }
}

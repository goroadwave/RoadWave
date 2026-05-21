import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

// OAuth handoff bridge for the QR-from-campground flow. Google OAuth
// fully leaves the app (browser navigates to accounts.google.com and
// back via Supabase's hosted callback), so any in-memory state is
// wiped. The `next` query param on the Supabase redirectTo URL is the
// primary mechanism for preserving the destination, but two failure
// modes make it unreliable on its own:
//
//   1. Bugs upstream of the OAuth call (e.g. the signup card briefly
//      hardcoded `next="/"`) silently drop the campground context.
//   2. A Supabase project misconfiguration (Site URL allow-list,
//      truncated redirectTo) can strip the `next` query param during
//      the round-trip — Supabase falls back to the project Site URL
//      with no query params attached.
//
// To survive both, this module persists a small server-side cookie
// before the OAuth window navigation. /auth/callback reads it after
// the exchange, validates the slug, and uses it to override a
// generic `next` (`/`, `/home`). The cookie is deleted on consumption.
//
// HttpOnly + SameSite=Lax keeps the cookie out of client JS (it's
// only ever read server-side) AND lets it survive the cross-site
// top-level navigation back from Google → Supabase → us (Lax allows
// cookies on cross-site top-level GET redirects).

const OAUTH_CONTEXT_COOKIE = 'pending_oauth_campground'
const OAUTH_CONTEXT_TTL_SECONDS = 15 * 60 // 15 min

// Reasonable bounds. Slug allow-list matches the QR landing route
// validator. returnTo is checked for shape (must start with
// `/campground/<allowed-slug>`) so a forged cookie can't redirect
// the camper anywhere arbitrary.
const SLUG_RE = /^[a-z0-9-]{1,80}$/
const RETURN_TO_RE = /^\/campground\/[a-z0-9-]{1,80}(\?[\w%=&-]{0,200})?$/

export type OAuthCampgroundContext = {
  slug: string
  returnTo: string
}

type StoredContext = OAuthCampgroundContext & {
  // ms-since-epoch. We also rely on the cookie's own maxAge for TTL,
  // but storing the timestamp lets `read()` reject anything visibly
  // stale even if a clock/cookie quirk somehow extends its life.
  ts: number
}

function validate(raw: unknown): OAuthCampgroundContext | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const slug = typeof obj.slug === 'string' ? obj.slug.trim().toLowerCase() : null
  const returnTo = typeof obj.returnTo === 'string' ? obj.returnTo : null
  if (!slug || !SLUG_RE.test(slug)) return null
  if (!returnTo || !RETURN_TO_RE.test(returnTo)) return null
  // The returnTo must point at the same slug we're claiming context
  // for. Defends against a stale cookie pointing at a different
  // campground than the URL the camper is actually in.
  if (!returnTo.startsWith(`/campground/${slug}`)) return null
  return { slug, returnTo }
}

// Write the cookie. Called from a `'use server'` action invoked by
// the Google button right before the browser navigates to Google.
export async function writeOAuthCampgroundContext(
  ctx: OAuthCampgroundContext,
): Promise<void> {
  const validated = validate(ctx)
  if (!validated) return // Don't persist garbage.
  const payload: StoredContext = {
    slug: validated.slug,
    returnTo: validated.returnTo,
    ts: Date.now(),
  }
  const jar = await cookies()
  jar.set(OAUTH_CONTEXT_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: OAUTH_CONTEXT_TTL_SECONDS,
  })
}

// Read the cookie. Returns null when missing, malformed, expired, or
// otherwise untrustworthy. /auth/callback consults this when the
// `next` query param is missing or generic.
export async function readOAuthCampgroundContext(): Promise<OAuthCampgroundContext | null> {
  const jar = await cookies()
  const raw = jar.get(OAUTH_CONTEXT_COOKIE)?.value
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const ctx = validate(parsed)
  if (!ctx) return null
  // Belt-and-braces TTL check on top of the cookie's own maxAge.
  if (parsed && typeof parsed === 'object') {
    const ts = (parsed as { ts?: unknown }).ts
    if (typeof ts === 'number') {
      const ageMs = Date.now() - ts
      if (ageMs > OAUTH_CONTEXT_TTL_SECONDS * 1000) return null
    }
  }
  return ctx
}

// Clear the cookie on a NextResponse. The callback calls this on its
// outgoing response so a successful redirect doesn't leave the cookie
// around to confuse a later sign-in.
export function clearOAuthCampgroundContext(response: NextResponse): void {
  response.cookies.delete(OAUTH_CONTEXT_COOKIE)
}

// Treat these `next` values as "generic" — they came from a default
// or a missing param, not from a deliberate destination, and the
// cookie / check-in recovery should win if it has a campground context.
//
// /home used to be on this list, but a signed-out camper bouncing
// through /login?next=/home (because they hit a (app) route while
// signed out) actually does mean "/home" -- treating it as generic
// caused the post-auth check-in recovery to override an explicit
// destination and route them to the campground hub instead. Limit
// "generic" to the truly-empty cases now: missing, "/", or "/?"
// from Supabase's URL-builder leaving a trailing "?".
export function isGenericNext(next: string | null | undefined): boolean {
  if (!next) return true
  const trimmed = next.trim()
  if (!trimmed) return true
  if (trimmed === '/' || trimmed === '/?') return true
  return false
}

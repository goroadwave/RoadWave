import { headers } from 'next/headers'

// Centralised reader for the pathname-of-this-request value that the
// proxy forwards as `x-pathname` / `x-search`. Used by the (app) layout
// and any other guarded surface that needs to build a ?next= redirect
// to /login when a signed-out (or otherwise gated) visitor lands on a
// page they can't reach yet.
//
// The proxy writes these headers via NextResponse.next({ request: {
// headers } }) in src/lib/supabase/middleware.ts -- App Router does not
// expose the request URL inside server components otherwise.
//
// We never return a value pointing back at /login, /verify, /consent,
// or any other auth-flow route. Those would create a redirect loop:
// /login redirects to /login?next=/login, which redirects to
// /login?next=%2Flogin%3Fnext=%2Flogin, etc. The allow-list rejects
// anything that's already inside the auth flow, /api, or marketing
// routes whose redirect would be pointless after sign-in.

const NEVER_LOOP_BACK_PREFIXES = [
  '/login',
  '/signup',
  '/verify',
  '/consent',
  '/forgot-password',
  '/auth/',
  '/api/',
  '/_next/',
] as const

export async function resolveIntendedNext(): Promise<string | null> {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''
  const search = h.get('x-search') ?? ''
  if (!pathname || !pathname.startsWith('/')) return null
  // Protocol-relative URLs ("//evil.example") would be treated as
  // off-site by the browser; reject defensively even though pathname
  // shouldn't ever produce one.
  if (pathname.startsWith('//')) return null
  for (const skip of NEVER_LOOP_BACK_PREFIXES) {
    if (pathname === skip || pathname.startsWith(skip)) return null
  }
  return `${pathname}${search}`
}

// Validate a `?next=...` query param before redirecting to it. Same
// rules as the resolver above plus an explicit length cap so a hostile
// query string can't blow up Vercel's URL limits. Returns null when
// the candidate is unsafe.
export function safeRedirectNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  if (raw.length > 2048) return null
  return raw
}

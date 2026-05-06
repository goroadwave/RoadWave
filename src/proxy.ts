import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Cookie that bridges the guest welcome page → signup/login → check-in.
// Set when a camper opens /campground/<slug>?token=<uuid> (a QR scan).
// Cleared when /checkin is reached. Read by the (app) layout after auth
// passes, which then redirects the freshly-authed user to
// /checkin?token=<value>. Short TTL so a stale value can't auto-route
// somebody who's just signing in for an unrelated reason much later.
const PENDING_CHECKIN_COOKIE = 'pending_checkin_token'
const PENDING_CHECKIN_TTL_SECONDS = 60 * 60 // 1 hour

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function proxy(request: NextRequest) {
  // 1. Run the Supabase session refresh first. Whatever response it
  // produces is the one we keep adding cookie mutations to.
  const response = await updateSession(request)

  const pathname = request.nextUrl.pathname
  const tokenParam = request.nextUrl.searchParams.get('token')

  // 2. Guest QR scan → set the bridge cookie.
  // Match /campground/<anything>: the welcome page lives at this path
  // and the token rides along as ?token=<uuid>. We only stash a value
  // that looks like a UUID to avoid trusting arbitrary query input.
  if (pathname.startsWith('/campground/') && tokenParam && UUID_RE.test(tokenParam)) {
    response.cookies.set(PENDING_CHECKIN_COOKIE, tokenParam, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: PENDING_CHECKIN_TTL_SECONDS,
    })
  }

  // 3. Reaching /checkin (with or without a token) means the bridge has
  // done its job. Clear the cookie so subsequent (app) navigations
  // don't loop the user back here.
  if (pathname === '/checkin' || pathname.startsWith('/checkin/')) {
    response.cookies.delete(PENDING_CHECKIN_COOKIE)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

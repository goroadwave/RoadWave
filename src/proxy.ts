import { NextResponse, type NextRequest } from 'next/server'
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

// Supabase auth cookies are prefixed `sb-` by the supabase/ssr
// package. Presence of any such cookie is a reliable signal that
// the visitor is signed in (or has a stale session that updateSession
// will resolve). Absence is a reliable "anon" signal at the
// middleware layer. We use this to special-case anon scans of the
// /checkin?token=<uuid> QR so the token isn't lost when the (app)
// layout bounces an anon user to /login.
function looksAuthenticated(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const tokenParam = request.nextUrl.searchParams.get('token')

  // Anon scan of the Optional Camper Connection QR encodes
  // /checkin?token=<uuid>. If we let that fall through to the
  // (app) layout's auth gate, it would redirect to /login WITHOUT
  // preserving the token -- the camper would end up on /home after
  // signup with no check-in. Catch the case here and route through
  // /signup?next=/checkin?token=<uuid> so the token rides along.
  //
  // This MUST happen before updateSession so we don't waste a
  // cookie write on a request we're about to redirect away from.
  if (
    pathname === '/checkin' &&
    tokenParam &&
    UUID_RE.test(tokenParam) &&
    !looksAuthenticated(request)
  ) {
    const next = `/checkin?token=${tokenParam}`
    return NextResponse.redirect(
      new URL(`/signup?next=${encodeURIComponent(next)}`, request.url),
    )
  }

  // 1. Run the Supabase session refresh. Whatever response it
  // produces is the one we keep adding cookie mutations to.
  const response = await updateSession(request)

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
  // don't loop the user back here. The anon-token case was handled
  // above; everyone reaching this block is either authed already or
  // doesn't carry a token, so the cookie is safe to delete.
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

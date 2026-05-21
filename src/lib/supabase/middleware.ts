import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths that this middleware MUST NEVER redirect away from. The /admin
// dashboard handles its own server-side gate via requireAdmin() in
// src/app/admin/layout.tsx — touching it from here would either
// duplicate the check or, worse, intercept admin traffic before the
// guard runs. Any future "redirect anonymous users to /login" or
// "redirect users without a display_name to /profile/setup" rule
// added to this middleware MUST consult ADMIN_EXEMPT_PREFIXES.
const ADMIN_EXEMPT_PREFIXES = ['/admin', '/api/admin'] as const

function isAdminPath(pathname: string): boolean {
  return ADMIN_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
}

export async function updateSession(request: NextRequest) {
  // Forward the request URL to server components so layouts and pages can
  // build accurate ?next= redirects without manually threading the
  // pathname through every level. Read in RSC via headers().get('x-pathname')
  // and headers().get('x-search'). Set on every NextResponse.next() below
  // so the upstream renderer always sees them, including after the cookie
  // rebuild in the supabase auth refresher.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-search', request.nextUrl.search)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({
            request: { headers: requestHeaders },
          })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser() validates the JWT with Supabase and refreshes if needed.
  // We always refresh — even on /admin paths — so the layout's
  // requireAdmin() sees a valid session.
  await supabase.auth.getUser()

  // Reserved exemption for /admin — see ADMIN_EXEMPT_PREFIXES above.
  // Today this middleware does no redirects, so the early return is
  // structurally identical to falling through. The branch exists so
  // any future contributor adding a "redirect to /login on no user"
  // rule here is forced to think about /admin first.
  if (isAdminPath(request.nextUrl.pathname)) {
    return response
  }

  return response
}

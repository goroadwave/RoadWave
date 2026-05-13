import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Sign out + redirect. Default destination is the homepage. Callers may
// pass ?next=/<path> to override. Only same-origin paths starting with
// a single "/" are honored; anything else falls back to "/" to avoid
// an open-redirect vector.
//
// IMPLEMENTATION NOTE
//
// We deliberately build the Supabase client inline here (instead of
// using createSupabaseServerClient from src/lib/supabase/server.ts)
// because this route returns a NextResponse.redirect, and the
// cookie-deletion writes that supabase.auth.signOut() emits MUST be
// attached to that specific redirect response.
//
// createSupabaseServerClient uses cookies() from next/headers, which
// tracks writes onto Next's implicit response — but when a route
// handler constructs and returns its OWN NextResponse object, those
// implicit writes don't always merge cleanly. The symptom users hit
// when this is wrong: tap Sign out → server clears session in
// memory but the response sent to the browser keeps the auth
// cookies → browser hits / on redirect → homepage still sees them
// as authed → getPostAuthDestination bounces them back to
// /owner/dashboard. The "I signed out but ended up back on the
// dashboard" bug.
//
// The inline pattern below explicitly calls response.cookies.set
// inside setAll so every cookie operation (including the deletions
// signOut emits) lands on the redirect response we're returning.

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  // Reject protocol-relative ("//evil.com") and absolute URLs.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export async function POST(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  const response = NextResponse.redirect(new URL(next, request.url), {
    status: 303,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  await supabase.auth.signOut()
  return response
}

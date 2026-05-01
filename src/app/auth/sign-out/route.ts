import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Sign out + redirect. Default destination is the homepage. Callers may
// pass ?next=/<path> to override. Only same-origin paths starting with
// a single "/" are honored; anything else falls back to "/" to avoid
// an open-redirect vector.
function safeNext(raw: string | null): string {
  if (!raw) return '/'
  // Reject protocol-relative ("//evil.com") and absolute URLs.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  return NextResponse.redirect(new URL(next, request.url), { status: 303 })
}

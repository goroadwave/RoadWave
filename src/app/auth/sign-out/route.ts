import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Sign out + redirect. Default destination is /login (guest flow). Owner
// pages pass ?next=/owner/login so they bounce to the owner-side login
// instead. Only same-origin paths starting with a single "/" are honored;
// anything else falls back to /login to avoid an open-redirect vector.
function safeNext(raw: string | null): string {
  if (!raw) return '/login'
  // Reject protocol-relative ("//evil.com") and absolute URLs.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/login'
  return raw
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  return NextResponse.redirect(new URL(next, request.url), { status: 303 })
}

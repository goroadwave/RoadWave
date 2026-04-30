import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendDemoLinkEmail } from '@/lib/email/demo-link'
import { getSiteOrigin } from '@/lib/utils'

// POST /api/demo/email
// JSON body: { slug: string, email: string }
// Looks up the demo by slug; if it's still live, sends the preview link
// to the requested email. The Resend send goes from hello@getroadwave.com.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let payload: { slug?: unknown; email?: unknown }
  try {
    payload = await request.json()
  } catch {
    return new NextResponse('Invalid JSON.', { status: 400 })
  }

  const slug = typeof payload.slug === 'string' ? payload.slug.trim() : ''
  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  if (!slug || !email) {
    return new NextResponse('slug and email are required.', { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return new NextResponse('Enter a valid email.', { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { data: demo, error } = await admin
    .from('demo_pages')
    .select('slug, campground_name, expires_at')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[api/demo/email] lookup failed:', error.message)
    return new NextResponse('Lookup failed.', { status: 500 })
  }
  if (!demo) {
    return new NextResponse('Demo not found.', { status: 404 })
  }
  if (new Date(demo.expires_at).getTime() <= Date.now()) {
    return new NextResponse('This demo link has expired.', { status: 410 })
  }

  const origin = getSiteOrigin(request.headers)
  const previewUrl = `${origin}/demo/${demo.slug}`

  const result = await sendDemoLinkEmail({
    toEmail: email,
    campgroundName: demo.campground_name,
    previewUrl,
  })
  if (!result.ok) {
    return new NextResponse(result.error ?? 'Email send failed.', { status: 502 })
  }

  return NextResponse.json({ ok: true })
}

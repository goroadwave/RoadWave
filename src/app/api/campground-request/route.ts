import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let payload: { email?: unknown; campground_name?: unknown }
  try {
    payload = await request.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  const campgroundName =
    typeof payload.campground_name === 'string' ? payload.campground_name.trim() : ''

  if (!email || !campgroundName) {
    return new NextResponse('Email and campground name are required.', { status: 400 })
  }
  if (email.length > 320 || campgroundName.length > 200) {
    return new NextResponse('One of those is way too long.', { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return new NextResponse('Enter a valid email.', { status: 400 })
  }

  const ip = getRequestIp(request.headers)
  const userAgent = request.headers.get('user-agent')

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('campground_requests').insert({
    email,
    campground_name: campgroundName,
    ip_address: ip,
    user_agent: userAgent,
  })
  if (error) {
    console.error('campground_requests insert failed:', error.message)
    return new NextResponse('Could not save your request right now.', { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

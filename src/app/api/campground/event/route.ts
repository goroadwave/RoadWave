import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'

// Append-only event logger for guest-side activity on the campground
// welcome page. Backs the "This Week" stats card on the owner dashboard
// and the Monday weekly report email.
//
// Inputs: { campground_id: uuid, event_type: one of the five allowed }.
// The id is taken at face value — campground_qr_tokens already serves
// as the access gate (a forged campground_id only injects noise into
// that one owner's stats, no privacy leak). isUuid + a strict event-
// type allow-list keep the surface tight.
//
// Writes go through the service-role admin client; the campground_events
// table is RLS-locked-down (no policies, see migration 0038) so this
// route is the only public path that can insert into it.

const ALLOWED_EVENTS = new Set([
  'qr_scan',
  'review_click',
  'book_again_click',
  'contact_message',
  'bulletin_view',
  // Pulse Check tap counts — added in migration 0039 alongside the
  // Engagement Hub. The "needs_attention" tap is also captured as a
  // campground_messages row via /api/campground/message; this event
  // type just keeps the running pulse count consistent in stats.
  'pulse_great',
  'pulse_good',
  'pulse_needs_attention',
  // Check-in lifecycle — added in migration 0041 so /admin/activity
  // can stream completed check-ins alongside QR scans + engagement
  // events. Written from the server-side checkInAction, not from the
  // public POST endpoint — keep them allow-listed here anyway so the
  // surface is consistent if a future caller needs them.
  'check_in_started',
  'check_in_completed',
])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  let payload: { campground_id?: unknown; event_type?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const campgroundId =
    typeof payload.campground_id === 'string' ? payload.campground_id : ''
  const eventType =
    typeof payload.event_type === 'string' ? payload.event_type : ''

  if (!UUID_RE.test(campgroundId)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid campground_id' },
      { status: 400 },
    )
  }
  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid event_type' },
      { status: 400 },
    )
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('campground_events').insert({
    campground_id: campgroundId,
    event_type: eventType,
    request_ip: getRequestIp(request.headers),
  })
  if (error) {
    console.error('[api/campground/event] insert failed:', error.message)
    return NextResponse.json(
      { ok: false, error: 'Insert failed' },
      { status: 500 },
    )
  }

  // 204 keeps response bodies out of the navigator.sendBeacon hot path.
  return new NextResponse(null, { status: 204 })
}

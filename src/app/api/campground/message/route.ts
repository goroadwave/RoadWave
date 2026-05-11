import { type NextRequest, NextResponse } from 'next/server'
import { sendContactMessageEmail } from '@/lib/email/contact-message-alert'
import { sendPulseNeedsAttentionEmail } from '@/lib/email/pulse-needs-attention-alert'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'

// Guest -> Owner structured message endpoint. Backs two surfaces on
// the campground welcome page:
//
//   1. Structured "Contact the Office" form. Required category (one of
//      nine), required body, optional contact pointer. Logged as a
//      campground_messages row with source='contact_form'.
//
//   2. "Something needs attention" follow-up form from the Pulse Check
//      flow. No category (the pulse itself is the signal), required
//      body, optional contact pointer. Logged with
//      source='pulse_needs_attention'.
//
// Both shapes are best-effort: we always insert the message row, then
// fire-and-forget log a campground_events row for stats parity, then
// best-effort send a Resend email to the owner when the campground's
// email_notifications_enabled flag is on. Email send failures don't
// fail the request — the dashboard inbox is the source of truth.

const ALLOWED_CATEGORIES = new Set([
  'wifi',
  'laundry',
  'propane',
  'late_checkout',
  'maintenance',
  'quiet_hours',
  'local_recommendations',
  'activities',
  'general_question',
])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_BODY = 2000
const MAX_CONTACT = 200

type Payload = {
  campground_id?: unknown
  source?: unknown
  category?: unknown
  body?: unknown
  guest_contact?: unknown
}

function bad(error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function POST(request: NextRequest) {
  let payload: Payload
  try {
    payload = await request.json()
  } catch {
    return bad('Invalid JSON')
  }

  const campgroundId =
    typeof payload.campground_id === 'string' ? payload.campground_id : ''
  const source = typeof payload.source === 'string' ? payload.source : ''
  const rawBody = typeof payload.body === 'string' ? payload.body.trim() : ''
  const rawCategory =
    typeof payload.category === 'string' ? payload.category : ''
  const rawContact =
    typeof payload.guest_contact === 'string'
      ? payload.guest_contact.trim()
      : ''

  if (!UUID_RE.test(campgroundId)) return bad('Invalid campground_id')
  if (source !== 'contact_form' && source !== 'pulse_needs_attention') {
    return bad('Invalid source')
  }
  if (rawBody.length === 0) return bad('Message body is required')
  if (rawBody.length > MAX_BODY) return bad('Message is too long')

  // Category is required for the contact form, ignored for the pulse
  // follow-up (we store null in that case to keep the column meaningful).
  let category: string | null = null
  if (source === 'contact_form') {
    if (!ALLOWED_CATEGORIES.has(rawCategory)) return bad('Invalid category')
    category = rawCategory
  }

  const guestContact =
    rawContact.length === 0
      ? null
      : rawContact.length > MAX_CONTACT
        ? rawContact.slice(0, MAX_CONTACT)
        : rawContact

  const admin = createSupabaseAdminClient()

  // Fetch the campground row up front — we need name + owner_email +
  // email_notifications_enabled for the optional alert email, and we
  // also use this as an existence check before inserting.
  const { data: cg } = await admin
    .from('campgrounds')
    .select(
      'id, name, slug, owner_email, email_notifications_enabled, feature_contact_office_enabled, feature_pulse_check_enabled',
    )
    .eq('id', campgroundId)
    .maybeSingle<{
      id: string
      name: string
      slug: string
      owner_email: string | null
      email_notifications_enabled: boolean
      feature_contact_office_enabled: boolean
      feature_pulse_check_enabled: boolean
    }>()

  if (!cg) return bad('Unknown campground', 404)

  // Defense in depth — if the owner has turned the feature off, accept
  // nothing through that source even if the welcome page somehow let
  // the form render. (The welcome page already gates the UI; this is
  // belt-and-suspenders for the API surface.)
  if (source === 'contact_form' && !cg.feature_contact_office_enabled) {
    return bad('Feature disabled', 403)
  }
  if (source === 'pulse_needs_attention' && !cg.feature_pulse_check_enabled) {
    return bad('Feature disabled', 403)
  }

  const requestIp = getRequestIp(request.headers)

  const { data: inserted, error: insertError } = await admin
    .from('campground_messages')
    .insert({
      campground_id: campgroundId,
      source,
      category,
      body: rawBody,
      guest_contact: guestContact,
      request_ip: requestIp,
    })
    .select('id, submitted_at')
    .single()

  if (insertError) {
    console.error('[api/campground/message] insert failed:', insertError.message)
    return bad('Insert failed', 500)
  }

  // Fire-and-forget stats event so the dashboard "This Week" card and
  // weekly report tally these messages alongside the rest of the
  // campground_events stream. We re-use the existing contact_message
  // type for contact forms; pulse follow-ups already get a separate
  // pulse_needs_attention event logged client-side when the user taps
  // the third pulse button, so we don't double-count here.
  if (source === 'contact_form') {
    void admin
      .from('campground_events')
      .insert({
        campground_id: campgroundId,
        event_type: 'contact_message',
        request_ip: requestIp,
        metadata: { category, message_id: inserted.id },
      })
      .then(({ error }) => {
        if (error) {
          console.error(
            '[api/campground/message] event log failed:',
            error.message,
          )
        }
      })
  }

  // Owner email — best-effort. Skipped silently when notifications are
  // off or owner_email is null.
  if (cg.email_notifications_enabled && cg.owner_email) {
    const dashboardUrl = buildDashboardUrl()
    if (source === 'contact_form' && category) {
      void sendContactMessageEmail({
        toEmail: cg.owner_email,
        campgroundName: cg.name,
        category,
        body: rawBody,
        guestContact,
        dashboardUrl,
      }).catch((err) => {
        console.error('[api/campground/message] contact email failed:', err)
      })
    } else if (source === 'pulse_needs_attention') {
      void sendPulseNeedsAttentionEmail({
        toEmail: cg.owner_email,
        campgroundName: cg.name,
        body: rawBody,
        guestContact,
        dashboardUrl,
      }).catch((err) => {
        console.error('[api/campground/message] pulse email failed:', err)
      })
    }
  }

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 })
}

function buildDashboardUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  ).replace(/\/$/, '')
  return `${base}/owner/messages`
}

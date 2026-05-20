import { randomBytes } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { sendContactMessageEmail } from '@/lib/email/contact-message-alert'
import { sendPulseNeedsAttentionEmail } from '@/lib/email/pulse-needs-attention-alert'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'

// Soft expiry on the guest_reply_token: 90 days from insert. After
// this the /m/<id>?t=<token> page returns "link expired" via the
// guest_message_thread RPC's expiry check (mig 0055). Owners can still
// see the thread indefinitely from /owner/messages -- the expiry only
// affects guest-side access.
const GUEST_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000

// 24 random bytes encoded as base64url -- 32 URL-safe characters.
// Node 16+ supports 'base64url' as a Buffer encoding natively, so no
// manual character substitution is needed.
function mintGuestReplyToken(): string {
  return randomBytes(24).toString('base64url')
}

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

// Allow-list for the contact-form category slug. The current
// dropdown surfaces nine slugs (see CONTACT_CATEGORIES in
// welcome-engagement.tsx) but the legacy values from before the
// 2026-05-20 category alignment are still accepted so old links,
// any embedded forms, and historical event-log entries continue to
// validate. The DB column has no CHECK constraint, so the API is
// the single source of truth for "what gets accepted today."
const ALLOWED_CATEGORIES = new Set([
  // Current 9-category set surfaced in the dropdown:
  'wifi',
  'maintenance',
  'noise',
  'bathroom_laundry',
  'late_checkout',
  'general_question',
  'compliment',
  'suggestion',
  'safety_concern',
  // Backward-compat: previous category slugs. Still accepted so
  // older forms / older messages keep working. Not in the dropdown
  // anymore but their labels stay in the owner inbox label maps.
  'laundry',
  'propane',
  'quiet_hours',
  'local_recommendations',
  'activities',
])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Loose email format check. Server side. Front end has stricter
// `type="email"` UI; this just keeps obvious garbage out of the DB.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MAX_BODY = 2000
const MAX_CONTACT = 200
// Structured guest-info field caps. Mirrored on the front end.
// All five are owner-only PII -- never read by any anon path.
const MAX_SITE = 60
const MAX_NAME = 80
const MAX_PHONE = 60
const MAX_EMAIL = 200

const ALLOWED_CONTACT_METHODS = new Set([
  'phone',
  'text',
  'email',
  'no_reply',
])

type Payload = {
  campground_id?: unknown
  source?: unknown
  category?: unknown
  body?: unknown
  guest_contact?: unknown
  // Structured guest info — required on new contact-form rows,
  // not posted by the pulse-needs-attention path.
  site_number?: unknown
  first_name?: unknown
  last_name?: unknown
  phone?: unknown
  email?: unknown
  preferred_contact_method?: unknown
}

function bad(error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

// Read a candidate string from the payload, trim, and cap. Empty
// strings become null so we don't insert empty rows. Anything
// other than a string -> null.
function readTrimmed(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
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

  // Structured guest fields (mig 0052). Only enforce requirements on
  // the contact-form path -- pulse-needs-attention rows still post
  // just body + optional guest_contact and store NULL for everything
  // structured. Caps are enforced; over-cap input is truncated rather
  // than rejected so a slightly-long pasted phone number doesn't
  // block the whole submission.
  const siteNumber = readTrimmed(payload.site_number, MAX_SITE)
  const firstName = readTrimmed(payload.first_name, MAX_NAME)
  const lastName = readTrimmed(payload.last_name, MAX_NAME)
  const phone = readTrimmed(payload.phone, MAX_PHONE)
  const email = readTrimmed(payload.email, MAX_EMAIL)
  const preferredContactMethod = readTrimmed(
    payload.preferred_contact_method,
    32,
  )

  if (source === 'contact_form') {
    if (!siteNumber) return bad('Site number is required.')
    if (!lastName) return bad('Last name is required.')
    if (!preferredContactMethod) {
      return bad('Pick a preferred contact method.')
    }
    if (!ALLOWED_CONTACT_METHODS.has(preferredContactMethod)) {
      return bad('Invalid preferred contact method.')
    }
    // Conditional requirements: phone iff method is phone/text,
    // email iff method is email. no_reply requires neither.
    if (
      (preferredContactMethod === 'phone' ||
        preferredContactMethod === 'text') &&
      !phone
    ) {
      return bad('Phone number is required for your chosen contact method.')
    }
    if (preferredContactMethod === 'email' && !email) {
      return bad('Email is required for your chosen contact method.')
    }
    if (email && !EMAIL_RE.test(email)) {
      return bad('Email address looks invalid.')
    }
  }

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

  // Mint the guest reply token ONLY for contact_form rows. The guest
  // /m/<id>?t=<token> page needs site_number + last_name to gate
  // access; pulse_needs_attention rows have neither, so they get no
  // token and aren't reachable from the guest reply flow.
  const guestReplyToken =
    source === 'contact_form' ? mintGuestReplyToken() : null
  const guestReplyTokenExpiresAt =
    guestReplyToken !== null
      ? new Date(Date.now() + GUEST_TOKEN_TTL_MS).toISOString()
      : null

  const { data: inserted, error: insertError } = await admin
    .from('campground_messages')
    .insert({
      campground_id: campgroundId,
      source,
      category,
      body: rawBody,
      guest_contact: guestContact,
      request_ip: requestIp,
      // Structured guest info (mig 0052). For pulse_needs_attention
      // these all stay null; the form only collects them on the
      // contact_form path.
      site_number: source === 'contact_form' ? siteNumber : null,
      first_name: source === 'contact_form' ? firstName : null,
      last_name: source === 'contact_form' ? lastName : null,
      phone: source === 'contact_form' ? phone : null,
      email: source === 'contact_form' ? email : null,
      preferred_contact_method:
        source === 'contact_form' ? preferredContactMethod : null,
      // Reply token (mig 0055). Always null for pulse rows.
      guest_reply_token: guestReplyToken,
      guest_reply_token_expires_at: guestReplyTokenExpiresAt,
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

  // Return the token + message id so the post-submit confirmation
  // screen can render the /m/<id>?t=<token> link the guest will use
  // to check the office reply. Token is null for pulse rows.
  return NextResponse.json(
    {
      ok: true,
      id: inserted.id,
      guest_reply_token: guestReplyToken,
    },
    { status: 201 },
  )
}

function buildDashboardUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  ).replace(/\/$/, '')
  return `${base}/owner/messages`
}

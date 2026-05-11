'use server'

import { z } from 'zod'
import { sendBrandedEmail, escapeHtml } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Server action backing /owners/start. The page is a short, action-
// focused intake form for prospective campground partners. We don't
// gate anything on Stripe here — the goal is to capture a structured
// lead, write it into campground_leads (so it shows up in the founder
// admin inbox alongside other demo requests), and email a richer
// summary to hello@getroadwave.com so a real human can follow up.
//
// The minimal subset (name, campground, email, phone) is persisted
// to campground_leads. The richer payload (city/state, three URLs,
// the six interest checkboxes) goes in the email body. No schema
// migration needed — this stays additive over the existing /api/
// campground-lead infrastructure.

const NOTIFY_TO = 'hello@getroadwave.com'
const DEFAULT_FROM = 'RoadWave <onboarding@resend.dev>'

const INTERESTS = [
  'more_google_reviews',
  'repeat_bookings',
  'guest_updates',
  'contact_office',
  'private_stay_feedback',
  'optional_camper_connection',
] as const

const INTEREST_LABEL: Record<(typeof INTERESTS)[number], string> = {
  more_google_reviews: 'More Google reviews',
  repeat_bookings: 'Repeat bookings',
  guest_updates: 'Guest updates',
  contact_office: 'Contact the office',
  private_stay_feedback: 'Private stay feedback',
  optional_camper_connection: 'Optional camper connection',
}

const optionalUrl = z
  .string()
  .max(300)
  .transform((s) => s.trim())
  .refine(
    (s) => s === '' || /^https?:\/\/[^\s]+$/i.test(s),
    'Must be a full https:// URL',
  )
  .transform((s) => (s === '' ? null : s))
  .nullable()
  .optional()

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()

const schema = z.object({
  campground_name: z.string().min(1).max(200),
  contact_name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: optionalText(60),
  website: optionalUrl,
  booking_url: optionalUrl,
  review_url: optionalUrl,
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  interests: z
    .array(z.enum(INTERESTS))
    .max(INTERESTS.length)
    .transform((arr) => Array.from(new Set(arr))),
})

export type OwnerPilotIntakeState = {
  error: string | null
  ok: boolean
}

export async function submitOwnerPilotIntakeAction(
  _prev: OwnerPilotIntakeState,
  formData: FormData,
): Promise<OwnerPilotIntakeState> {
  const parsed = schema.safeParse({
    campground_name: formData.get('campground_name') ?? '',
    contact_name: formData.get('contact_name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    website: formData.get('website') ?? '',
    booking_url: formData.get('booking_url') ?? '',
    review_url: formData.get('review_url') ?? '',
    city: formData.get('city') ?? '',
    state: formData.get('state') ?? '',
    interests: formData.getAll('interests'),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? 'Please check the form.'
    return { error: String(first), ok: false }
  }

  const data = parsed.data

  // 1. Persist to campground_leads — minimal subset matches the
  //    existing table shape so this lead shows up in the founder
  //    admin inbox alongside other intake submissions.
  const admin = createSupabaseAdminClient()
  const { error: dbError } = await admin.from('campground_leads').insert({
    name: data.contact_name,
    campground_name: data.campground_name,
    email: data.email,
    phone: data.phone,
  })
  if (dbError) {
    console.error('[owners/start] campground_leads insert failed:', dbError.message)
    // Don't fail the whole submit on a DB error — the email still goes
    // out so the lead doesn't slip through.
  }

  // 2. Send a richer email to hello@getroadwave.com. The full intake
  //    detail lives here so a human can follow up with everything in
  //    one inbox preview.
  const interestsLabels = data.interests.map((slug) => INTEREST_LABEL[slug])
  const subject = `New RoadWave pilot intake — ${data.campground_name}`
  const html = buildHtml({ data, interests: interestsLabels })
  const text = buildText({ data, interests: interestsLabels })

  const result = await sendBrandedEmail({
    to: NOTIFY_TO,
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    replyTo: data.email,
    subject,
    html,
    text,
  })

  if (!result.ok) {
    // The DB insert succeeded so the lead isn't lost; we still surface
    // the email failure so we can debug.
    console.error('[owners/start] notify email failed:', result.error)
    return {
      error:
        'Saved your details but the notification email failed. We may still reach out, or try again in a moment.',
      ok: false,
    }
  }

  return { error: null, ok: true }
}

// ---------------------------------------------------------------------------
// Email body builders
// ---------------------------------------------------------------------------

type EmailArgs = {
  data: z.infer<typeof schema>
  interests: string[]
}

function buildHtml({ data, interests }: EmailArgs): string {
  // Optional fields come through as string | null | undefined from the
  // Zod schema; normalize to string | null so the filter below behaves
  // predictably (falsy on null/undefined/empty alike).
  const rows: [string, string | null][] = [
    ['Campground', data.campground_name],
    ['Contact', data.contact_name],
    ['Email', data.email],
    ['Phone', data.phone ?? null],
    ['Location', `${data.city}, ${data.state}`],
    ['Website', data.website ?? null],
    ['Booking URL', data.booking_url ?? null],
    ['Google Review URL', data.review_url ?? null],
  ]

  const tableRows = rows
    .filter(([, v]) => !!v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 14px 6px 0; color:#94a3b8; font-size:13px; vertical-align:top; white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:6px 0; color:#f5ecd9; font-weight:600;">${escapeHtml(v as string)}</td></tr>`,
    )
    .join('')

  const interestsHtml =
    interests.length > 0
      ? `<ul style="margin:8px 0 0; padding-left:20px; color:#cbd3e0; font-size:14px; line-height:1.55;">${interests
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}</ul>`
      : `<p style="margin:8px 0 0; color:#64748b; font-style:italic; font-size:13px;">No specific focus areas selected.</p>`

  const bodyHtml = `
    <p style="margin:0 0 16px;">A new campground just kicked off a RoadWave pilot intake.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 16px; margin:0 0 18px;">
      ${tableRows}
    </table>
    <p style="margin:0; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">What they want RoadWave to help with</p>
    ${interestsHtml}
  `

  return buildBrandedHtml({
    preheader: `New pilot intake from ${data.campground_name}.`,
    eyebrow: 'New pilot intake',
    headline: data.campground_name,
    bodyHtml,
    recipient: NOTIFY_TO,
  })
}

function buildText({ data, interests }: EmailArgs): string {
  const lines: string[] = [
    `New RoadWave pilot intake`,
    ``,
    `Campground: ${data.campground_name}`,
    `Contact:    ${data.contact_name}`,
    `Email:      ${data.email}`,
  ]
  if (data.phone) lines.push(`Phone:      ${data.phone}`)
  lines.push(`Location:   ${data.city}, ${data.state}`)
  if (data.website) lines.push(`Website:    ${data.website}`)
  if (data.booking_url) lines.push(`Booking:    ${data.booking_url}`)
  if (data.review_url) lines.push(`Reviews:    ${data.review_url}`)
  lines.push(``)
  lines.push(`Focus areas: ${interests.length ? interests.join(', ') : 'none specified'}`)
  return lines.join('\n')
}

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendOwnerWelcomeEmail } from '@/lib/email/owner-welcome'
import {
  MAX_AMENITY_NOTE_CHARS,
  MAX_CUSTOM_AMENITY_CHARS,
} from '@/lib/campgrounds/amenities'

export type ProfileSaveState = { error: string | null; ok: boolean }

// Amenities are now stored as display labels (e.g. "Heated Pool",
// "Dog-Friendly") rather than the older internal slugs, AND owners can
// add free-form custom amenities. The schema therefore validates each
// entry as a trimmed, sane-length string and de-duplicates the array.
// Cap is 80 entries — comfortably above the curated standard list
// length (~45) plus the 20-custom-per-spec ceiling.
const AMENITIES_CAP = 80
const amenityString = z
  .string()
  .trim()
  .min(1)
  .max(MAX_CUSTOM_AMENITY_CHARS)

// Per-amenity notes. Parsed from a hidden JSON payload posted by the
// owner profile form. Each value capped + trimmed; orphan keys (keys
// whose amenity is no longer in the saved array) are dropped after
// validation in saveOwnerProfileAction. Cap on total keys = the same
// 80-entry cap on the amenities array, so a malicious payload can't
// balloon the column.
const amenityNoteValue = z
  .string()
  .max(MAX_AMENITY_NOTE_CHARS)
  .transform((s) => s.trim())
const amenityNotesPayload = z
  .string()
  .max(20_000)
  .transform((raw, ctx) => {
    if (!raw || raw.trim() === '') return {} as Record<string, string>
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid amenity notes payload',
      })
      return z.NEVER
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amenity notes must be an object',
      })
      return z.NEVER
    }
    const out: Record<string, string> = {}
    let count = 0
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (count >= 80) break
      if (typeof v !== 'string') continue
      const noteCheck = amenityNoteValue.safeParse(v)
      if (!noteCheck.success || noteCheck.data === '') continue
      out[k] = noteCheck.data
      count++
    }
    return out
  })

// Optional URLs the owner configures for the welcome-page Review +
// Book Again CTAs. Empty strings (the form posts "" when the input is
// blank) coerce to null so we don't write blanks into the column.
const optionalUrl = z
  .string()
  .max(500)
  .transform((s) => s.trim())
  .refine(
    (s) => s === '' || /^https?:\/\/[^\s]+$/i.test(s),
    'Must be a full https:// URL',
  )
  .transform((s) => (s === '' ? null : s))
  .nullable()
  .optional()

// Trim + treat blank as null + cap length. Used by every short
// owner-edited string field where the column is nullable and a
// blank submission should clear the field rather than write '' to
// the database. Reused by the guest-hub sections in mig 0049
// (Wi-Fi, Rules, Emergency, Local Recommendations).
function blankToNull(maxLen: number) {
  return z
    .string()
    .max(maxLen)
    .transform((s) => s.trim())
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()
}

const schema = z.object({
  campground_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  timezone: z.string().min(1).max(60),
  amenities: z
    .array(amenityString)
    .max(AMENITIES_CAP)
    // De-dupe (case-sensitive — labels are case-stable; custom
    // amenities the owner repeats on accident shouldn't double-up).
    .transform((arr) => Array.from(new Set(arr))),
  amenity_notes_json: amenityNotesPayload,
  logo_url: z.string().max(500).optional().nullable(),
  google_review_url: optionalUrl,
  booking_url: optionalUrl,
  booking_message: z
    .string()
    .max(500)
    .transform((s) => s.trim())
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional(),
  booking_promo_code: z
    .string()
    .max(60)
    .transform((s) => s.trim())
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional(),
  // Facebook fields (mig 0057). URL validated by the shared optionalUrl
  // schema; custom label is plain text, capped to match the column
  // comment in the migration. Empty strings coerce to null so we
  // don't write blanks.
  //
  // Label refinement: reject anything that starts with http:// or
  // https://. A live bug on production caught an owner pasting their
  // Facebook URL into the label field by mistake -- the URL silently
  // stored as a text label, the URL column stayed null, and the
  // welcome page hid the Facebook button forever. The explicit refine
  // surfaces a clear error so the owner moves the URL to the correct
  // field above instead of saving a broken state.
  facebook_review_url: optionalUrl,
  facebook_button_label: z
    .string()
    .max(60)
    .transform((s) => s.trim())
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()
    .refine(
      (v) => !v || !/^https?:\/\//i.test(v),
      'That looks like a URL. Put your Facebook URL in the field above and leave this for a custom button label like "Follow Us on Facebook".',
    ),
  // Park Map (mig 0048). show_park_map arrives as the literal 'on'
  // string when the checkbox is checked, undefined otherwise.
  // park_map_url reuses the optionalUrl validator. park_map_notes is
  // a short caption; empty strings coerce to null so we don't write
  // blanks.
  show_park_map: z
    .union([z.literal('on'), z.literal('true'), z.literal('')])
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  park_map_url: optionalUrl,
  park_map_notes: z
    .string()
    .max(500)
    .transform((s) => s.trim())
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional(),
  // Wi-Fi (mig 0049). Network name + password + notes. Helper text
  // on the owner form reminds them this is the GUEST network only.
  show_wifi: z
    .union([z.literal('on'), z.literal('true'), z.literal('')])
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  wifi_network_name: blankToNull(120),
  wifi_password: blankToNull(200),
  wifi_notes: blankToNull(500),
  // Rules & Policies. Free-form long text.
  show_rules: z
    .union([z.literal('on'), z.literal('true'), z.literal('')])
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  rules_text: blankToNull(5000),
  // Emergency Info. Four short text fields covering the situations
  // a guest might need at 2am: primary number, after-hours line,
  // shelter info, and other notes.
  show_emergency_info: z
    .union([z.literal('on'), z.literal('true'), z.literal('')])
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  emergency_contact_number: blankToNull(60),
  emergency_after_hours: blankToNull(300),
  emergency_shelter_notes: blankToNull(1000),
  emergency_other_notes: blankToNull(1000),
  // Local Recommendations. Free-form text for now; a future
  // migration may introduce a normalized table for row-based
  // add/edit without breaking this column.
  show_local_recommendations: z
    .union([z.literal('on'), z.literal('true'), z.literal('')])
    .optional()
    .transform((v) => v === 'on' || v === 'true'),
  local_recommendations_text: blankToNull(5000),
  // Arrival & Departure (mig 0060). All-text fields so owners can
  // write "2:00 PM", "After 1pm", or "Flexible -- call ahead"
  // without losing nuance to a strict time type. Empty values
  // collapse to null via blankToNull so the camper-facing card
  // can hide blank rows cleanly.
  check_in_time: blankToNull(60),
  check_out_time: blankToNull(60),
  early_check_in_note: blankToNull(300),
  late_check_out_note: blankToNull(300),
  arrival_departure_note: blankToNull(500),
})

export async function saveOwnerProfileAction(
  _prev: ProfileSaveState,
  formData: FormData,
): Promise<ProfileSaveState> {
  const parsed = schema.safeParse({
    campground_id: formData.get('campground_id'),
    name: formData.get('name'),
    address: formData.get('address') || null,
    phone: formData.get('phone') || null,
    website: formData.get('website') || null,
    timezone: formData.get('timezone') || 'America/New_York',
    amenities: formData.getAll('amenities'),
    amenity_notes_json: formData.get('amenity_notes_json') ?? '{}',
    logo_url: formData.get('logo_url') || null,
    google_review_url: formData.get('google_review_url') ?? '',
    booking_url: formData.get('booking_url') ?? '',
    booking_message: formData.get('booking_message') ?? '',
    booking_promo_code: formData.get('booking_promo_code') ?? '',
    facebook_review_url: formData.get('facebook_review_url') ?? '',
    facebook_button_label: formData.get('facebook_button_label') ?? '',
    show_park_map: formData.get('show_park_map') ?? '',
    park_map_url: formData.get('park_map_url') ?? '',
    park_map_notes: formData.get('park_map_notes') ?? '',
    show_wifi: formData.get('show_wifi') ?? '',
    wifi_network_name: formData.get('wifi_network_name') ?? '',
    wifi_password: formData.get('wifi_password') ?? '',
    wifi_notes: formData.get('wifi_notes') ?? '',
    show_rules: formData.get('show_rules') ?? '',
    rules_text: formData.get('rules_text') ?? '',
    show_emergency_info: formData.get('show_emergency_info') ?? '',
    emergency_contact_number: formData.get('emergency_contact_number') ?? '',
    emergency_after_hours: formData.get('emergency_after_hours') ?? '',
    emergency_shelter_notes: formData.get('emergency_shelter_notes') ?? '',
    emergency_other_notes: formData.get('emergency_other_notes') ?? '',
    show_local_recommendations: formData.get('show_local_recommendations') ?? '',
    local_recommendations_text: formData.get('local_recommendations_text') ?? '',
    check_in_time: formData.get('check_in_time') ?? '',
    check_out_time: formData.get('check_out_time') ?? '',
    early_check_in_note: formData.get('early_check_in_note') ?? '',
    late_check_out_note: formData.get('late_check_out_note') ?? '',
    arrival_departure_note: formData.get('arrival_departure_note') ?? '',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first = Object.values(flat.fieldErrors).flat()[0] ?? 'Invalid input'
    return { error: String(first), ok: false }
  }

  // Prune orphan notes: keys whose amenity is no longer in the saved
  // array shouldn't make it to the column. The client already does this,
  // but re-check server-side so a hand-crafted payload can't write notes
  // for amenities the owner hasn't selected.
  const amenitySet = new Set(parsed.data.amenities)
  const prunedNotes: Record<string, string> = {}
  for (const [k, v] of Object.entries(parsed.data.amenity_notes_json)) {
    if (amenitySet.has(k)) prunedNotes[k] = v
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('campgrounds')
    .update({
      name: parsed.data.name,
      address: parsed.data.address,
      phone: parsed.data.phone,
      website: parsed.data.website,
      timezone: parsed.data.timezone,
      amenities: parsed.data.amenities,
      amenity_notes: prunedNotes,
      logo_url: parsed.data.logo_url,
      google_review_url: parsed.data.google_review_url ?? null,
      booking_url: parsed.data.booking_url ?? null,
      booking_message: parsed.data.booking_message ?? null,
      booking_promo_code: parsed.data.booking_promo_code ?? null,
      facebook_review_url: parsed.data.facebook_review_url ?? null,
      facebook_button_label: parsed.data.facebook_button_label ?? null,
      show_park_map: parsed.data.show_park_map,
      park_map_url: parsed.data.park_map_url ?? null,
      park_map_notes: parsed.data.park_map_notes ?? null,
      show_wifi: parsed.data.show_wifi,
      wifi_network_name: parsed.data.wifi_network_name ?? null,
      wifi_password: parsed.data.wifi_password ?? null,
      wifi_notes: parsed.data.wifi_notes ?? null,
      show_rules: parsed.data.show_rules,
      rules_text: parsed.data.rules_text ?? null,
      show_emergency_info: parsed.data.show_emergency_info,
      emergency_contact_number: parsed.data.emergency_contact_number ?? null,
      emergency_after_hours: parsed.data.emergency_after_hours ?? null,
      emergency_shelter_notes: parsed.data.emergency_shelter_notes ?? null,
      emergency_other_notes: parsed.data.emergency_other_notes ?? null,
      show_local_recommendations: parsed.data.show_local_recommendations,
      local_recommendations_text: parsed.data.local_recommendations_text ?? null,
      check_in_time: parsed.data.check_in_time ?? null,
      check_out_time: parsed.data.check_out_time ?? null,
      early_check_in_note: parsed.data.early_check_in_note ?? null,
      late_check_out_note: parsed.data.late_check_out_note ?? null,
      arrival_departure_note: parsed.data.arrival_departure_note ?? null,
    })
    .eq('id', parsed.data.campground_id)
  if (error) return { error: error.message, ok: false }

  // Welcome email side-effect: send only the first time a profile is saved.
  // We use the admin client because welcome_email_sent_at + owner_email read
  // benefit from bypassing RLS (the column was added in 0010 and the read
  // policy on campgrounds is owner-restricted; both are fine, but admin is
  // simpler and email send shouldn't depend on policy edge cases).
  await maybeSendWelcomeEmail(parsed.data.campground_id)

  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/profile')
  return { error: null, ok: true }
}

async function maybeSendWelcomeEmail(campgroundId: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { data: cg } = await admin
    .from('campgrounds')
    .select('id, name, slug, owner_email, welcome_email_sent_at')
    .eq('id', campgroundId)
    .single()
  if (!cg || cg.welcome_email_sent_at || !cg.owner_email) return

  // Look up the campground's QR token + owner display name in parallel.
  const [{ data: token }, { data: adminLink }] = await Promise.all([
    admin
      .from('campground_qr_tokens')
      .select('token')
      .eq('campground_id', cg.id)
      .maybeSingle(),
    admin
      .from('campground_admins')
      .select('user_id')
      .eq('campground_id', cg.id)
      .eq('role', 'owner')
      .maybeSingle(),
  ])
  if (!token?.token) return

  let ownerName: string | null = null
  if (adminLink?.user_id) {
    const { data: prof } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', adminLink.user_id)
      .single()
    ownerName = prof?.display_name ?? null
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'

  const result = await sendOwnerWelcomeEmail({
    toEmail: cg.owner_email,
    ownerName,
    campgroundName: cg.name,
    qrCheckInUrl: `${siteUrl}/campground/${cg.slug}?token=${token.token}`,
    dashboardUrl: `${siteUrl}/owner/dashboard`,
  })

  if (result.ok) {
    await admin
      .from('campgrounds')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', cg.id)
  }
  // If !result.ok we don't stamp — let the next save attempt try again.
}

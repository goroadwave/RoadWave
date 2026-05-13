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

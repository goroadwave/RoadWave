import { z } from 'zod'
import { INTERESTS } from '@/lib/constants/interests'
import { TRAVEL_STYLES } from '@/lib/constants/travel-styles'

const interestSlugs = INTERESTS.map((i) => i.slug) as [string, ...string[]]
const travelStyleSlugs = TRAVEL_STYLES.map((t) => t.slug) as [string, ...string[]]

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()

const optionalInt = (min: number, max: number) =>
  z
    .union([z.literal(''), z.coerce.number().int().min(min).max(max)])
    .transform((v) => (v === '' ? null : v))
    .nullable()

const optionalTravelStyle = z
  .preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.enum(travelStyleSlugs).nullable(),
  )

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, 'Display name is required').max(40),
  rig_type: optionalText(60),
  miles_driven: optionalInt(0, 9_999_999),
  hometown: optionalText(80),
  status_tag: optionalText(40),
  personal_note: optionalText(280),
  // Was capped at 100 — too tight, surfaced "Too big: expected number to be
  // <=100" to users who mistyped or interpreted the field broadly. Keeping a
  // generous defensive upper bound only to prevent absurd integer overflow.
  years_rving: optionalInt(0, 9_999),
  has_pets: z.boolean(),
  pet_info: optionalText(120),
  travel_style: optionalTravelStyle,
  privacy_mode: z.enum(['visible', 'quiet', 'invisible', 'campground_updates_only']),
  share_rig_type: z.boolean(),
  share_miles_driven: z.boolean(),
  share_hometown: z.boolean(),
  share_status: z.boolean(),
  share_note: z.boolean(),
  share_years: z.boolean(),
  share_pet: z.boolean(),
  share_travel_style: z.boolean(),
  share_interests: z.boolean(),
  // Self-mute toggles. Only consulted when privacy_mode is
  // 'campground_updates_only', but always present so the form can roundtrip
  // them regardless of mode.
  share_bulletins: z.boolean().default(true),
  share_meetups: z.boolean().default(true),
  interest_slugs: z.array(z.enum(interestSlugs)).default([]),
})

export type ProfileInput = z.infer<typeof profileSchema>

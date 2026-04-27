import { z } from 'zod'
import { INTERESTS } from '@/lib/constants/interests'

const interestSlugs = INTERESTS.map((i) => i.slug) as [string, ...string[]]

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

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, 'Display name is required').max(40),
  rig_type: optionalText(60),
  miles_driven: optionalInt(0, 9_999_999),
  hometown: optionalText(80),
  status_tag: optionalText(40),
  personal_note: optionalText(280),
  years_rving: optionalInt(0, 100),
  has_pets: z.boolean(),
  pet_info: optionalText(120),
  privacy_mode: z.enum(['visible', 'quiet', 'invisible']),
  share_rig_type: z.boolean(),
  share_miles_driven: z.boolean(),
  share_hometown: z.boolean(),
  share_status: z.boolean(),
  share_note: z.boolean(),
  share_years: z.boolean(),
  share_pet: z.boolean(),
  share_interests: z.boolean(),
  interest_slugs: z.array(z.enum(interestSlugs)).default([]),
})

export type ProfileInput = z.infer<typeof profileSchema>

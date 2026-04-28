'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ProfileSaveState = { error: string | null; ok: boolean }

const AMENITIES = [
  'full_hookups',
  'water_electric',
  'tent_sites',
  'wifi',
  'pool',
  'dog_friendly',
  'laundry',
  'store',
  'restrooms',
  'showers',
] as const

const schema = z.object({
  campground_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  timezone: z.string().min(1).max(60),
  amenities: z.array(z.enum(AMENITIES)).max(20),
  logo_url: z.string().max(500).optional().nullable(),
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
    logo_url: formData.get('logo_url') || null,
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first = Object.values(flat.fieldErrors).flat()[0] ?? 'Invalid input'
    return { error: String(first), ok: false }
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
      logo_url: parsed.data.logo_url,
    })
    .eq('id', parsed.data.campground_id)
  if (error) return { error: error.message, ok: false }

  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/profile')
  return { error: null, ok: true }
}

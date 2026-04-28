'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendOwnerWelcomeEmail } from '@/lib/email/owner-welcome'

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
    .select('id, name, owner_email, welcome_email_sent_at')
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
    qrCheckInUrl: `${siteUrl}/checkin?token=${token.token}`,
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

'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type OwnerSetupState = { error: string | null }

const schema = z.object({
  display_name: z.string().min(1).max(120),
  campground_name: z.string().min(1).max(120),
  city: z.string().max(80).optional().or(z.literal('')),
  region: z.string().max(80).optional().or(z.literal('')),
  website: z
    .string()
    .url({ message: 'Website must be a full URL (https://…)' })
    .or(z.literal('')),
})

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'campground'
  )
}

// Mirrors the username scheme from /owner/signup actions: 24 chars max,
// alphanumeric + underscore, derived from the user id so it's stable.
function makeUsername(userId: string): string {
  const tail = userId.replace(/-/g, '').slice(0, 18)
  return `owner_${tail}`
}

// Provisions a campground for an already-authenticated user. Used by the
// post-OAuth setup page. The user already has an auth.users row + a profile
// row (created by the handle_new_user trigger), so this only needs to:
//   1. Set role='owner' + display_name + a clean username on profiles.
//   2. Create the campground.
//   3. Link via campground_admins (host first, upgrade to owner).
//   4. Seed the QR token.
export async function ownerSetupAction(
  _prev: OwnerSetupState,
  formData: FormData,
): Promise<OwnerSetupState> {
  const parsed = schema.safeParse({
    display_name: formData.get('display_name'),
    campground_name: formData.get('campground_name'),
    city: formData.get('city') ?? '',
    region: formData.get('region') ?? '',
    website: formData.get('website') ?? '',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? 'Check your fields and try again.'
    return { error: String(first) }
  }
  const { display_name, campground_name, city, region, website } = parsed.data

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Your session expired — please sign in again.' }
  }
  const userId = user.id
  const ownerEmail = user.email ?? ''

  const admin = createSupabaseAdminClient()

  // If they already provisioned (e.g. double-submit, refresh), short-circuit.
  const { data: existingLink } = await admin
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existingLink) redirect('/owner/dashboard')

  // 1) Update profile — role + display_name. Upgrade username to owner_xxx
  // (the trigger creates one like rv_xxx by default; renaming is cleaner).
  const username = makeUsername(userId)
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ username, display_name, role: 'owner' })
    .eq('id', userId)
  if (profileErr) {
    console.error('[owner-setup] profile update failed:', profileErr.message)
    return { error: `Profile update failed: ${profileErr.message}` }
  }

  // 2) Create campground.
  const slug = `${slugify(campground_name)}-${userId.slice(0, 6)}`
  const { data: campground, error: cgError } = await admin
    .from('campgrounds')
    .insert({
      name: campground_name,
      slug,
      owner_email: ownerEmail,
      city: city || null,
      region: region || null,
      website: website || null,
      is_active: true,
    })
    .select('id')
    .single()
  if (cgError || !campground) {
    console.error(
      '[owner-setup] campground insert failed:',
      cgError?.message ?? '(no row returned)',
    )
    return { error: cgError?.message ?? "Couldn't create campground." }
  }
  const campgroundId = campground.id

  // 3) Link admin (host first; upgrade to owner once 0011 is applied).
  const { error: adminError } = await admin.from('campground_admins').insert({
    campground_id: campgroundId,
    user_id: userId,
    role: 'host',
  })
  if (adminError) {
    console.error('[owner-setup] campground_admins insert failed:', adminError.message)
    await admin.from('campgrounds').delete().eq('id', campgroundId)
    return {
      error: `Couldn't link your account to the campground: ${adminError.message}`,
    }
  }

  const { error: upgradeError } = await admin
    .from('campground_admins')
    .update({ role: 'owner' })
    .eq('campground_id', campgroundId)
    .eq('user_id', userId)
  if (upgradeError) {
    console.warn(
      "[owner-setup] couldn't upgrade campground_admins.role to 'owner':",
      upgradeError.message,
    )
  }

  // 4) Seed QR token (best effort).
  const { error: tokenError } = await admin
    .from('campground_qr_tokens')
    .insert({ campground_id: campgroundId })
  if (tokenError) {
    console.warn('[owner-setup] qr token insert failed (non-fatal):', tokenError.message)
  }

  redirect('/owner/dashboard')
}

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type ProvisionState = { error: string | null }

const schema = z.object({
  campground_name: z.string().min(1).max(120),
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

// Manual recovery path. If automatic signup provisioning failed (e.g.,
// owner exists in auth but no campgrounds row + no campground_admins
// link), this gives them a way to finish setup themselves. Idempotent:
// if a campground link already exists, we just redirect to /owner/profile
// rather than provisioning a second one.
export async function provisionCampgroundAction(
  _prev: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  const parsed = schema.safeParse({
    campground_name: formData.get('campground_name'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ??
      'Enter a campground name.'
    return { error: String(first) }
  }
  const { campground_name } = parsed.data

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const admin = createSupabaseAdminClient()

  // Idempotency: if the user already has a campground link, do nothing
  // and bounce them to the profile page so they don't accidentally
  // create duplicates by double-tapping.
  const { data: existing } = await admin
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) {
    redirect('/owner/profile')
  }

  // 1) Create the campground.
  const slug = `${slugify(campground_name)}-${user.id.slice(0, 6)}`
  const { data: campground, error: cgError } = await admin
    .from('campgrounds')
    .insert({
      name: campground_name,
      slug,
      owner_email: user.email ?? null,
      is_active: true,
    })
    .select('id')
    .single()
  if (cgError || !campground) {
    console.error(
      '[provision-recovery] campground insert failed:',
      cgError?.message ?? '(no row)',
    )
    return {
      error: cgError?.message ?? "Couldn't create the campground.",
    }
  }
  const campgroundId = campground.id

  // 2) Link via campground_admins. Always insert with role='host' (the
  // value that's been in the enum since 0001), then best-effort upgrade
  // to 'owner'. Same pattern as the signup action.
  const { error: linkError } = await admin
    .from('campground_admins')
    .insert({
      campground_id: campgroundId,
      user_id: user.id,
      role: 'host',
    })
  if (linkError) {
    console.error(
      '[provision-recovery] campground_admins insert failed:',
      linkError.message,
    )
    // Clean up the orphan campground.
    await admin.from('campgrounds').delete().eq('id', campgroundId)
    return {
      error: `Couldn't link your account to the campground: ${linkError.message}`,
    }
  }

  const { error: upgradeError } = await admin
    .from('campground_admins')
    .update({ role: 'owner' })
    .eq('campground_id', campgroundId)
    .eq('user_id', user.id)
  if (upgradeError) {
    console.warn(
      "[provision-recovery] couldn't upgrade campground_admins.role to 'owner' (apply 0011_fix_owner_enum.sql):",
      upgradeError.message,
    )
  }

  // 3) QR token row so /owner/qr immediately works.
  const { error: tokenError } = await admin
    .from('campground_qr_tokens')
    .insert({ campground_id: campgroundId })
  if (tokenError) {
    console.warn(
      '[provision-recovery] qr token insert failed (non-fatal):',
      tokenError.message,
    )
  }

  // 4) Set profile.role = 'owner' so the (authed) layout doesn't bounce
  // the user back to /checkin on the next request. Best-effort.
  const { error: profileError } = await admin
    .from('profiles')
    .update({ role: 'owner' })
    .eq('id', user.id)
  if (profileError) {
    console.warn(
      "[provision-recovery] couldn't set profile.role='owner':",
      profileError.message,
    )
  }

  // 5) Revalidate the surfaces that depend on this data.
  revalidatePath('/owner/dashboard')
  revalidatePath('/owner/profile')
  revalidatePath('/owner/qr')

  redirect('/owner/profile')
}

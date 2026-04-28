'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Returns explicit ok flag. The client component decides what to do next
// (typically router.refresh()). Returning instead of redirect() means
// useActionState always re-renders with a fresh state we can show, and
// any error has a visible code path on screen.
export type ProvisionState = {
  ok: boolean
  error: string | null
  campgroundId: string | null
}

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

// Manual recovery path. If automatic signup provisioning failed (auth user
// exists but no campgrounds row + no campground_admins link), this gives
// them a way to finish setup themselves. Idempotent: if a link already
// exists we report ok with the existing id rather than creating a second.
export async function provisionCampgroundAction(
  _prev: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  console.log('[provision-recovery] action invoked')
  try {
    const rawName = formData.get('campground_name')
    console.log('[provision-recovery] form data:', { campground_name: rawName })
    const parsed = schema.safeParse({ campground_name: rawName })
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const first =
        Object.values(flat.fieldErrors).flat()[0] ??
        'Enter a campground name.'
      console.warn('[provision-recovery] validation failed:', first)
      return { ok: false, error: String(first), campgroundId: null }
    }
    const { campground_name } = parsed.data

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.warn('[provision-recovery] no auth user — bailing')
      return { ok: false, error: 'Not signed in.', campgroundId: null }
    }
    console.log('[provision-recovery] user:', user.id, user.email)

    const admin = createSupabaseAdminClient()

    // Idempotency: if the user already has a campground link, return ok
    // with the existing id. Prevents double-provisioning on retry.
    const { data: existing } = await admin
      .from('campground_admins')
      .select('campground_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) {
      console.log(
        '[provision-recovery] existing link found, returning ok:',
        existing.campground_id,
      )
      return {
        ok: true,
        error: null,
        campgroundId: existing.campground_id,
      }
    }

    // 1) Create the campground.
    const slug = `${slugify(campground_name)}-${user.id.slice(0, 6)}`
    console.log('[provision-recovery] inserting campground with slug:', slug)
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
        ok: false,
        error: cgError?.message ?? "Couldn't create the campground.",
        campgroundId: null,
      }
    }
    const campgroundId = campground.id
    console.log('[provision-recovery] campground created:', campgroundId)

    // 2) Link via campground_admins. Always 'host' first (in enum since
    // 0001), then best-effort upgrade to 'owner'.
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
      await admin.from('campgrounds').delete().eq('id', campgroundId)
      return {
        ok: false,
        error: `Couldn't link your account to the campground: ${linkError.message}`,
        campgroundId: null,
      }
    }
    console.log('[provision-recovery] campground_admins link inserted')

    const { error: upgradeError } = await admin
      .from('campground_admins')
      .update({ role: 'owner' })
      .eq('campground_id', campgroundId)
      .eq('user_id', user.id)
    if (upgradeError) {
      console.warn(
        "[provision-recovery] couldn't upgrade role to 'owner':",
        upgradeError.message,
      )
    }

    // 3) QR token row.
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
    // the user to /checkin on the next request.
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

    revalidatePath('/owner/dashboard')
    revalidatePath('/owner/profile')
    revalidatePath('/owner/qr')

    console.log(
      '[provision-recovery] success, returning ok with campgroundId:',
      campgroundId,
    )
    return { ok: true, error: null, campgroundId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error.'
    console.error('[provision-recovery] threw:', err)
    return { ok: false, error: msg, campgroundId: null }
  }
}

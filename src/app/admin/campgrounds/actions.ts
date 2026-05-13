'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type AdminMutationResult = { ok: boolean; error: string | null }

const DEMO_SLUG = 'roadwave-demo-campground'
const DEMO_CAMPER_EMAIL_RE = /^demo-camper-\d+@example\.com$/

/**
 * Clear per-run activity on the RoadWave Demo Campground only.
 *
 * Slug is hardcoded — this action refuses to run against any other
 * campground. Mirrors scripts/reset-demo-campground.mjs so the admin
 * can re-cycle the demo state without dropping to a terminal.
 *
 * Resets:
 *   - bulletins / meetups / check_ins / campground_events for the
 *     demo campground
 *   - all auth users matching demo-camper-N@example.com (cascades to
 *     profiles → profile_interests → check_ins)
 *
 * Preserves:
 *   - the campgrounds row itself
 *   - the campground_admins owner link
 *   - the campground_qr_tokens row (so the QR URL is stable)
 *   - the demo owner auth user (demo@getroadwave.com)
 *
 * After running this, re-execute scripts/seed-demo-campground.mjs
 * --apply locally to repopulate the bulletin / meetup / campers.
 */
export async function resetDemoCampgroundAction(): Promise<AdminMutationResult> {
  const { user } = await requireAdmin()
  const admin = createSupabaseAdminClient()

  const { data: cg } = await admin
    .from('campgrounds')
    .select('id, name, slug')
    .eq('slug', DEMO_SLUG)
    .maybeSingle<{ id: string; name: string; slug: string }>()

  if (!cg) {
    return {
      ok: false,
      error: `No campground with slug ${DEMO_SLUG} found. Seed it first.`,
    }
  }

  // Belt-and-braces: refuse if the demo slug somehow points at a
  // different campground (renamed by hand, etc.). The reset is only
  // safe when the row really is the demo campground.
  if (cg.name !== 'RoadWave Demo Campground') {
    return {
      ok: false,
      error: `Slug ${DEMO_SLUG} exists but name is ${JSON.stringify(cg.name)}. Refusing to reset.`,
    }
  }

  // Sweep activity tables. Order doesn't matter (no FKs between them
  // besides campground_id which we're filtering on directly).
  for (const table of [
    'campground_events',
    'bulletins',
    'meetups',
    'check_ins',
  ] as const) {
    const { error } = await admin.from(table).delete().eq('campground_id', cg.id)
    if (error) {
      return { ok: false, error: `${table} delete: ${error.message}` }
    }
  }

  // Sweep demo-camper auth users. Pagination matches the seed script's
  // listUsers loop so we don't miss any past page 1.
  let deletedCampers = 0
  const perPage = 200
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      return { ok: false, error: `listUsers: ${error.message}` }
    }
    for (const u of data?.users ?? []) {
      if (u.email && DEMO_CAMPER_EMAIL_RE.test(u.email)) {
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id)
        if (!delErr) deletedCampers += 1
      }
    }
    if (!data?.users || data.users.length < perPage) break
  }

  await admin.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'demo_campground.reset',
    target_table: 'campgrounds',
    target_id: cg.id,
    before: null,
    after: { deleted_campers: deletedCampers },
  })

  revalidatePath('/admin/campgrounds')
  revalidatePath('/admin/activity')
  return { ok: true, error: null }
}

export async function extendCampgroundTrialAction(
  id: string,
  days: number,
): Promise<AdminMutationResult> {
  if (!Number.isInteger(days) || days <= 0 || days > 365) {
    return { ok: false, error: 'Days must be 1–365.' }
  }
  const { supabase, user } = await requireAdmin()
  const { data: prior } = await supabase
    .from('campgrounds')
    .select('trial_ends_at, subscription_status')
    .eq('id', id)
    .maybeSingle()
  const { data: newEnd, error } = await supabase.rpc(
    'extend_campground_trial',
    { _campground_id: id, _days: days },
  )
  if (error) return { ok: false, error: error.message }
  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'campground.extend_trial',
    target_table: 'campgrounds',
    target_id: id,
    before: prior,
    after: { trial_ends_at: newEnd, days_added: days },
  })
  revalidatePath('/admin/campgrounds')
  return { ok: true, error: null }
}

export async function toggleCampgroundActiveAction(
  id: string,
  next: boolean,
): Promise<AdminMutationResult> {
  const { supabase, user } = await requireAdmin()
  const { data: prior } = await supabase
    .from('campgrounds')
    .select('is_active')
    .eq('id', id)
    .maybeSingle()
  // .select('id') makes PostgREST return the affected rows so we can
  // detect a 0-row update — that's how a silent RLS rejection would
  // present without it (no error, no change).
  const { data: updated, error } = await supabase
    .from('campgrounds')
    .update({ is_active: next })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, error: error.message }
  if (!updated || updated.length === 0) {
    return {
      ok: false,
      error: 'No row updated. Check that the campground exists and you have admin rights.',
    }
  }
  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'campground.toggle_active',
    target_table: 'campgrounds',
    target_id: id,
    before: prior,
    after: { is_active: next },
  })
  revalidatePath('/admin/campgrounds')
  return { ok: true, error: null }
}

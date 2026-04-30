'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/guard'

export type AdminMutationResult = { ok: boolean; error: string | null }

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

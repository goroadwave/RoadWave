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
  const { error } = await supabase
    .from('campgrounds')
    .update({ is_active: next })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
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

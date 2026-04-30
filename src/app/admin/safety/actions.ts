'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/guard'

const ALLOWED_STATUSES = ['open', 'under_review', 'actioned', 'dismissed'] as const
type Status = (typeof ALLOWED_STATUSES)[number]
function isStatus(s: unknown): s is Status {
  return typeof s === 'string' && (ALLOWED_STATUSES as readonly string[]).includes(s)
}

export type AdminMutationResult = { ok: boolean; error: string | null }

export async function updateReportStatusAction(
  id: string,
  status: string,
): Promise<AdminMutationResult> {
  if (!isStatus(status)) return { ok: false, error: 'Invalid status.' }
  const { supabase, user } = await requireAdmin()
  const { data: prior } = await supabase
    .from('reports')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  const reviewed = status === 'actioned' || status === 'dismissed'
  const { data: updated, error } = await supabase
    .from('reports')
    .update({ status, reviewed_at: reviewed ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, error: error.message }
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'No report updated.' }
  }
  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'report.status_updated',
    target_table: 'reports',
    target_id: id,
    before: prior,
    after: { status },
  })
  revalidatePath('/admin/safety')
  return { ok: true, error: null }
}

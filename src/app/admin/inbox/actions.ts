'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/guard'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const ALLOWED_STATUSES = ['new', 'read', 'replied', 'flagged'] as const
type Status = (typeof ALLOWED_STATUSES)[number]
function isStatus(s: unknown): s is Status {
  return typeof s === 'string' && (ALLOWED_STATUSES as readonly string[]).includes(s)
}

export type AdminMutationResult = { ok: boolean; error: string | null }

async function logAudit(
  action: string,
  target_table: string,
  target_id: string,
  before: unknown,
  after: unknown,
) {
  const { supabase, user } = await requireAdmin()
  await supabase.from('admin_audit_log').insert({
    admin_id: user.id,
    action,
    target_table,
    target_id,
    before: before as object,
    after: after as object,
  })
}

export async function updateLeadStatusAction(
  id: string,
  status: string,
): Promise<AdminMutationResult> {
  if (!isStatus(status)) return { ok: false, error: 'Invalid status.' }
  const { supabase } = await requireAdmin()
  const { data: prior } = await supabase
    .from('campground_leads')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  const { data: updated, error } = await supabase
    .from('campground_leads')
    .update({
      status,
      replied_at: status === 'replied' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, error: error.message }
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'No lead updated.' }
  }
  await logAudit('lead.status_updated', 'campground_leads', id, prior, { status })
  revalidatePath('/admin/inbox')
  return { ok: true, error: null }
}

export async function updateRequestStatusAction(
  id: string,
  status: string,
): Promise<AdminMutationResult> {
  if (!isStatus(status)) return { ok: false, error: 'Invalid status.' }
  const { supabase } = await requireAdmin()
  const { data: prior } = await supabase
    .from('campground_requests')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  const { data: updated, error } = await supabase
    .from('campground_requests')
    .update({
      status,
      replied_at: status === 'replied' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, error: error.message }
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'No request updated.' }
  }
  await logAudit('request.status_updated', 'campground_requests', id, prior, { status })
  revalidatePath('/admin/inbox')
  return { ok: true, error: null }
}

const SUBMISSION_STATUSES = [
  'new',
  'paid',
  'abandoned',
  'provisioned',
] as const
type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]
function isSubmissionStatus(s: unknown): s is SubmissionStatus {
  return (
    typeof s === 'string' &&
    (SUBMISSION_STATUSES as readonly string[]).includes(s)
  )
}

export async function updateOwnerSubmissionStatusAction(
  id: string,
  status: string,
): Promise<AdminMutationResult> {
  if (!isSubmissionStatus(status)) {
    return { ok: false, error: 'Invalid status.' }
  }
  // Gate via the user-context admin guard (requireAdmin verifies
  // is_admin), then write through the service-role client because
  // owner_signup_submissions has no client-facing UPDATE policy by
  // design — admins read, the system writes.
  const { user } = await requireAdmin()
  const admin = createSupabaseAdminClient()
  const { data: prior } = await admin
    .from('owner_signup_submissions')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  const { data: updated, error } = await admin
    .from('owner_signup_submissions')
    .update({ status })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, error: error.message }
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'No submission updated.' }
  }
  await admin.from('admin_audit_log').insert({
    admin_id: user.id,
    action: 'owner_submission.status_updated',
    target_table: 'owner_signup_submissions',
    target_id: id,
    before: prior,
    after: { status },
  })
  revalidatePath('/admin/inbox')
  return { ok: true, error: null }
}

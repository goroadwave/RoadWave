'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendReportNotificationEmail } from '@/lib/email/report-notification'

export type ReportState = { ok: boolean; error: string | null }

const schema = z.object({
  category: z.enum(['low', 'medium', 'high']),
  description: z.string().trim().min(1).max(4000),
  reported_user_id: z.string().uuid().nullable().optional(),
  campground_id: z.string().uuid().nullable().optional(),
})

// Submit a tiered report. High-severity reports auto-suspend the reported
// account. All severities trigger an email to the safety inbox.
export async function submitReportAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = schema.safeParse({
    category: formData.get('category'),
    description: formData.get('description'),
    reported_user_id: emptyToNull(formData.get('reported_user_id')),
    campground_id: emptyToNull(formData.get('campground_id')),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? 'Check the form and try again.'
    return { ok: false, error: String(first) }
  }
  const { category, description, reported_user_id, campground_id } = parsed.data

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please sign in to submit a report.' }

  // Insert the report row via the regular client (RLS allows the reporter
  // to insert rows where reporter_id = auth.uid()).
  const { data: insertedRow, error: insertError } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_user_id: reported_user_id ?? null,
      campground_id: campground_id ?? null,
      category,
      description,
    })
    .select('id, created_at')
    .single()
  if (insertError || !insertedRow) {
    console.error('[report] insert failed:', insertError?.message)
    return { ok: false, error: insertError?.message ?? "Couldn't submit the report." }
  }

  // Side effects (auto-suspend + email) need elevated access.
  const admin = createSupabaseAdminClient()

  // Auto-suspend on High when we have a target user.
  let suspended = false
  if (category === 'high' && reported_user_id) {
    const { error: suspendError } = await admin
      .from('profiles')
      .update({
        suspended_at: new Date().toISOString(),
        suspension_reason: `auto-suspend: high-severity report ${insertedRow.id}`,
      })
      .eq('id', reported_user_id)
      .is('suspended_at', null)
    if (suspendError) {
      console.error('[report] suspend failed:', suspendError.message)
    } else {
      suspended = true
    }
  }

  // Pull display fields for the safety email.
  const [reporterRow, reportedRow, cgRow] = await Promise.all([
    admin.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    reported_user_id
      ? admin
          .from('profiles')
          .select('username, display_name')
          .eq('id', reported_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    campground_id
      ? admin
          .from('campgrounds')
          .select('name')
          .eq('id', campground_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const sent = await sendReportNotificationEmail({
    reportId: insertedRow.id,
    category,
    description,
    reporter: {
      id: user.id,
      email: user.email ?? null,
      username: reporterRow.data?.username ?? null,
    },
    reported: {
      id: reported_user_id ?? null,
      username: reportedRow.data?.username ?? null,
      display_name: reportedRow.data?.display_name ?? null,
    },
    campground: {
      id: campground_id ?? null,
      name: cgRow.data?.name ?? null,
    },
    createdAt: insertedRow.created_at,
    suspended,
  })
  if (!sent.ok) {
    console.error('[report] notification email failed:', sent.error)
    // Non-fatal — the row landed; the inbox notification is best-effort.
  }

  return { ok: true, error: null }
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string' || v.trim() === '') return null
  return v
}

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Server actions backing the Engagement section of the dashboard:
// the five on/off toggles (four feature flags + email notifications).
// Each is a single-column update gated to the owner via campground_admins
// — the RLS policies on campgrounds enforce that the calling user
// administers the row, so this action only needs to validate inputs.

const ALLOWED_TOGGLES = new Set([
  'feature_review_enabled',
  'feature_book_again_enabled',
  'feature_contact_office_enabled',
  'feature_pulse_check_enabled',
  'email_notifications_enabled',
])

const schema = z.object({
  campground_id: z.string().uuid(),
  column: z.string().refine((c) => ALLOWED_TOGGLES.has(c), {
    message: 'Unknown toggle',
  }),
  // The form posts "true" / "false" as strings because the underlying
  // checkbox is uncontrolled; we normalize here.
  value: z
    .string()
    .transform((v) => v === 'true' || v === 'on')
    .pipe(z.boolean()),
})

export type ToggleState = { error: string | null; ok: boolean }

export async function setEngagementToggleAction(
  _prev: ToggleState,
  formData: FormData,
): Promise<ToggleState> {
  const parsed = schema.safeParse({
    campground_id: formData.get('campground_id'),
    column: formData.get('column'),
    value: formData.get('value') ?? 'false',
  })
  if (!parsed.success) {
    return { error: 'Invalid toggle request.', ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('campgrounds')
    // Dynamic column updates aren't typed by Supabase JS — we cast to
    // any once, scoped to the validated allow-list above. The column
    // name has already been checked against ALLOWED_TOGGLES so this is
    // safe from SQL injection / spurious columns.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ [parsed.data.column]: parsed.data.value } as any)
    .eq('id', parsed.data.campground_id)
  if (error) return { error: error.message, ok: false }

  revalidatePath('/owner/dashboard')
  // Revalidate the public welcome page so the toggle effect is visible
  // immediately — Next 16 caches `force-dynamic` pages per-request but
  // we want any in-flight cached responses to flush too.
  revalidatePath(`/campground/[slug]`, 'page')
  return { error: null, ok: true }
}

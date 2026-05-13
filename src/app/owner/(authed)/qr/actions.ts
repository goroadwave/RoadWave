'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type RotateState = { error: string | null; ok: boolean }
export type GenerateState = { ok: boolean; error: string | null }

// Provision a QR token for a campground that doesn't have one yet.
//
// Older campgrounds (and Stripe-webhook-provisioned rows from before
// the trigger was reliable) can end up without a campground_qr_tokens
// row, leaving /owner/qr with no token to render. This action lets the
// owner self-serve creating one without contacting support.
//
// Idempotent: if a token already exists for the campground, returns
// { ok: true } without mutating. Ownership is verified via the
// RLS-aware client against campground_admins before the admin-client
// insert.
export async function generateQrTokenAction(
  campgroundId: string,
): Promise<GenerateState> {
  if (typeof campgroundId !== 'string' || campgroundId.length === 0) {
    return { ok: false, error: 'Missing campground.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  // Confirm the caller is an admin/owner of THIS campground. Without
  // this gate, anyone could provision a token for a campground they
  // don't own (campground_qr_tokens is service-role-only, so the
  // gate has to live in the action layer).
  const { data: link } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('campground_id', campgroundId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!link) {
    return { ok: false, error: 'Not authorized for this campground.' }
  }

  // Idempotent — if a token already exists (e.g. a concurrent click,
  // or the trigger fired and we're racing), short-circuit success.
  const admin = createSupabaseAdminClient()
  const { data: existing } = await admin
    .from('campground_qr_tokens')
    .select('campground_id')
    .eq('campground_id', campgroundId)
    .maybeSingle()
  if (existing) {
    revalidatePath('/owner/qr')
    return { ok: true, error: null }
  }

  // Bare insert — token defaults to gen_random_uuid(), rotated_at
  // defaults to now() per migration 0002.
  const { error } = await admin
    .from('campground_qr_tokens')
    .insert({ campground_id: campgroundId })
  if (error) {
    // 23505 = unique_violation on the campground_id PK — concurrent
    // insert won the race. Treat as success.
    if ((error as { code?: string }).code === '23505') {
      revalidatePath('/owner/qr')
      return { ok: true, error: null }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/owner/qr')
  return { ok: true, error: null }
}

// Rotate the campground QR token. The campground_qr_tokens table has one row
// per campground with a unique token. We update it in place via the admin
// client, which immediately invalidates any printed QR using the old token.
export async function rotateQrTokenAction(
  _prev: RotateState,
  formData: FormData,
): Promise<RotateState> {
  const campgroundId = formData.get('campground_id')
  if (typeof campgroundId !== 'string') {
    return { error: 'Missing campground.', ok: false }
  }

  // Verify caller is an admin/owner of this campground via RLS-aware client.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  const { data: link } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('campground_id', campgroundId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!link) return { error: 'Not authorized for this campground.', ok: false }

  // The tokens table is service-role only by design — use the admin client
  // for the rotation itself.
  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('campground_qr_tokens')
    .update({ token: crypto.randomUUID(), rotated_at: new Date().toISOString() })
    .eq('campground_id', campgroundId)
  if (error) return { error: error.message, ok: false }

  revalidatePath('/owner/qr')
  return { error: null, ok: true }
}

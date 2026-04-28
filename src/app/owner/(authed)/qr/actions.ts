'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type RotateState = { error: string | null; ok: boolean }

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

'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type NotifActionResult = { ok: boolean; error: string | null }

// Mark a single notification as read for the calling user. RLS scopes
// the UPDATE to user_id = auth.uid() — there's no way to mark someone
// else's notification read.
export async function markNotificationReadAction(
  id: string,
): Promise<NotifActionResult> {
  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, error: 'Invalid notification id' }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) {
    console.error('[notif] mark read failed:', error.message)
    return { ok: false, error: error.message }
  }
  // Refresh the layout so the lantern refetches its count.
  revalidatePath('/home')
  return { ok: true, error: null }
}

// Mark every unread notification for the calling user as read via the
// security-definer RPC.
export async function markAllNotificationsReadAction(): Promise<NotifActionResult> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('mark_all_notifications_read')
  if (error) {
    console.error('[notif] mark all read failed:', error.message)
    return { ok: false, error: error.message }
  }
  revalidatePath('/home')
  return { ok: true, error: null }
}

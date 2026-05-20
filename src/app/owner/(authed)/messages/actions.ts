'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Server actions for the /owner/messages inbox. Each one is a thin
// wrapper around the owner_set_message_status SECURITY DEFINER RPC
// (mig 0052 + the 0053 column-ambiguity fix). The RPC itself runs
// the campground_admins ownership check, so this layer just:
//   1. confirms the caller is signed in (cookie session),
//   2. calls the RPC with the requested new status,
//   3. revalidates /owner/messages so the inbox re-fetches.
//
// Read-back columns are intentionally aliased on the RPC side
// (out_id / out_status / out_read_at / out_resolved_at) to avoid the
// plpgsql "column reference id is ambiguous" error from the original
// mig 0052 signature. The client doesn't read the return value --
// optimistic UI + revalidate is enough -- but we keep the typed
// shape for future callers.

export type MessageStatusUpdate = {
  ok: boolean
  error: string | null
}

async function setStatus(
  messageId: string,
  newStatus: 'new' | 'read' | 'resolved',
): Promise<MessageStatusUpdate> {
  if (typeof messageId !== 'string' || messageId.length < 8) {
    return { ok: false, error: 'Invalid message id.' }
  }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  // We don't use the row data on the client; the page revalidates
  // and re-renders with the fresh state. Skipping .returns<> entirely
  // sidesteps supabase-js's RPC return-type inference for the new
  // mig 0052 / 0053 functions.
  const { error } = await supabase.rpc('owner_set_message_status', {
    _message_id: messageId,
    _new_status: newStatus,
  })
  if (error) {
    // Surface the Postgres error so the UI can show a meaningful
    // message ("not authorized", "message not found", etc.) without
    // leaking internals.
    return { ok: false, error: error.message }
  }

  // Revalidate the inbox + dashboard so the unread badge updates on
  // the next render. The toast-polling client island re-fetches the
  // count on its own cadence so the badge converges even without
  // this revalidation, but invalidating here is faster.
  revalidatePath('/owner/messages')
  revalidatePath('/owner/dashboard')
  return { ok: true, error: null }
}

export async function markMessageReadAction(
  messageId: string,
): Promise<MessageStatusUpdate> {
  return setStatus(messageId, 'read')
}

export async function markMessageResolvedAction(
  messageId: string,
): Promise<MessageStatusUpdate> {
  return setStatus(messageId, 'resolved')
}

export async function markMessageUnreadAction(
  messageId: string,
): Promise<MessageStatusUpdate> {
  return setStatus(messageId, 'new')
}

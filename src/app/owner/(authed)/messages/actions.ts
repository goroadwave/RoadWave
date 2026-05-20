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

export type BulkArchiveResult = {
  ok: boolean
  archivedCount: number
  error: string | null
}

async function setStatus(
  messageId: string,
  newStatus: 'new' | 'read' | 'resolved' | 'archived',
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

export async function markMessageArchivedAction(
  messageId: string,
): Promise<MessageStatusUpdate> {
  return setStatus(messageId, 'archived')
}

// Unarchive returns the row to 'resolved' (where Archive normally
// comes from), not 'new'. An owner unarchiving by accident probably
// wants the message back in the resolved bucket, not screaming on the
// nav badge.
export async function unarchiveMessageAction(
  messageId: string,
): Promise<MessageStatusUpdate> {
  return setStatus(messageId, 'resolved')
}

// Bulk-archive every resolved message for the caller's most-recent
// campground. RPC ownership-gated via campground_admins membership;
// the action verifies the caller is signed in first.
export async function archiveAllResolvedAction(): Promise<BulkArchiveResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, archivedCount: 0, error: 'Not signed in.' }
  }

  // Most-recent admin link — mirrors loadOwnerCampground so the bulk
  // archive targets the same row /owner/messages reads from.
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
  const link = links?.[0]
  if (!link) {
    return { ok: false, archivedCount: 0, error: 'No campground linked.' }
  }

  const { data, error } = await supabase.rpc('owner_archive_all_resolved', {
    _campground_id: link.campground_id,
  })
  if (error) {
    return { ok: false, archivedCount: 0, error: error.message }
  }

  // RPC returns table(out_archived_count integer). PostgREST surfaces
  // that as an array of one object; supabase-js's RPC return-type
  // inference doesn't catch the set-returning shape, so cast.
  const rows = (data as unknown as { out_archived_count: number }[] | null) ??
    []
  const archivedCount = Number(rows[0]?.out_archived_count ?? 0)

  revalidatePath('/owner/messages')
  revalidatePath('/owner/dashboard')
  return { ok: true, archivedCount, error: null }
}

// Permanently delete a single ARCHIVED message. The SECURITY DEFINER
// RPC refuses to delete anything whose status is not 'archived', so a
// misfire from another caller can't wipe an active inbox row. The
// strong confirmation dialog lives in the UI; this layer is the
// last-mile call.
export async function deleteArchivedMessageAction(
  messageId: string,
): Promise<MessageStatusUpdate> {
  if (typeof messageId !== 'string' || messageId.length < 8) {
    return { ok: false, error: 'Invalid message id.' }
  }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { error } = await supabase.rpc('owner_delete_archived_message', {
    _message_id: messageId,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/owner/messages')
  revalidatePath('/owner/dashboard')
  return { ok: true, error: null }
}

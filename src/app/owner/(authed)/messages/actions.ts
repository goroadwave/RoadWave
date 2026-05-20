'use server'

import { revalidatePath } from 'next/cache'
import { sendContactMessageReplyEmail } from '@/lib/email/contact-message-reply'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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

// Post an owner reply on a Contact the Office message. Wraps the
// owner_post_message_reply SECURITY DEFINER RPC (mig 0055), which
// enforces campground_admins membership server-side. After a successful
// insert, fires a best-effort guest notification email if the original
// message has an email pointer + email_notifications_enabled is on.
export async function postOwnerReplyAction(
  messageId: string,
  body: string,
): Promise<MessageStatusUpdate> {
  if (typeof messageId !== 'string' || messageId.length < 8) {
    return { ok: false, error: 'Invalid message id.' }
  }
  const trimmed = (body ?? '').trim()
  if (trimmed.length === 0) {
    return { ok: false, error: 'Reply body required.' }
  }
  if (trimmed.length > 4000) {
    return { ok: false, error: 'Reply is too long (max 4000 chars).' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { error } = await supabase.rpc('owner_post_message_reply', {
    _message_id: messageId,
    _body: trimmed,
  })
  if (error) return { ok: false, error: error.message }

  // Best-effort guest notification. We use the admin client here only
  // to read the parent message + campground row -- the owner has
  // already passed the RPC's campground_admins gate above, so this
  // server-side fetch is just a join we can't do cheaply through the
  // user-scoped client. Service-role still ONLY touches what's needed
  // to assemble the email.
  void (async () => {
    try {
      const admin = createSupabaseAdminClient()
      const { data: msg } = await admin
        .from('campground_messages')
        .select(
          'id, email, site_number, last_name, guest_reply_token, campground_id',
        )
        .eq('id', messageId)
        .maybeSingle<{
          id: string
          email: string | null
          site_number: string | null
          last_name: string | null
          guest_reply_token: string | null
          campground_id: string
        }>()
      if (!msg || !msg.email || !msg.guest_reply_token) return

      const { data: cg } = await admin
        .from('campgrounds')
        .select('name, email_notifications_enabled')
        .eq('id', msg.campground_id)
        .maybeSingle<{ name: string; email_notifications_enabled: boolean }>()
      if (!cg || !cg.email_notifications_enabled) return

      await sendContactMessageReplyEmail({
        toEmail: msg.email,
        campgroundName: cg.name,
        replyBody: trimmed,
        replyUrl: buildGuestReplyUrl(msg.id, msg.guest_reply_token),
        siteNumber: msg.site_number,
        lastName: msg.last_name,
      })
    } catch (err) {
      console.error('[owner reply email] failed:', err)
    }
  })()

  revalidatePath('/owner/messages')
  revalidatePath('/owner/dashboard')
  return { ok: true, error: null }
}

function buildGuestReplyUrl(messageId: string, token: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  ).replace(/\/$/, '')
  return `${base}/m/${encodeURIComponent(messageId)}?t=${encodeURIComponent(token)}`
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

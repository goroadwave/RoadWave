import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Returns the current unread + safety counts plus the latest
// guest-reply timestamp for the owner's most-recent campground.
// Used by:
//   * OwnerMessageBadge (top nav) -- amber/red unread pill +
//     pulse animation, derived from unread_total.
//   * OwnerMessageToaster -- detects increments since the last
//     poll and fires a visible toast. Three toast kinds:
//       - 'normal': unread_total went up (new guest contact-form
//         message arrived).
//       - 'safety': unread_safety went up (new safety_concern
//         message arrived; wins over normal in the same tick).
//       - 'reply': latest_guest_reply_at advanced (a camper
//         replied to an existing thread; the parent message's
//         status doesn't change, so unread_total wouldn't catch
//         it -- this third field is the dedicated signal).
//   * OwnerMessagesAutoRefresh (on /owner/messages) -- shares
//     the same poll cadence indirectly via the toaster; the
//     page-level component does its own router.refresh() so the
//     thread bubbles re-fetch from the server.
//
// Auth: cookie session must belong to an authed owner. The
// owner_message_counts RPC is SECURITY DEFINER + gated by
// campground_admins membership, so a forged or unauthorized
// campground_id (or a missing one) returns zeros, never another
// owner's counts.
//
// Reply timestamp source: campground_message_replies has RLS
// enabled with no read policies (owner reads happen via the
// SECURITY DEFINER owner_message_thread RPC). To avoid adding
// another RPC just for "max created_at," we use the admin client
// here, scoped strictly to the owner's resolved campground_id.
// The owner already passed the campground_admins ownership check
// (resolving the link id above), so the admin client never reads
// outside what the owner is authorized to see.
//
// Output: { ok: true, unread_total, unread_safety, latest_guest_reply_at }
// On error / no campground / unauthenticated: { ok: false, ... } with
// safe-default zeros so the polling client never throws and the
// badge defaults to "no unread."

type CountsRow = {
  unread_total: number | string
  unread_safety: number | string
}

type ReplyTsRow = {
  created_at: string
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        unread_total: 0,
        unread_safety: 0,
        latest_guest_reply_at: null,
      },
      { status: 401 },
    )
  }

  // Most-recent admin link mirrors loadOwnerCampground -- an owner
  // managing 2+ campgrounds sees counts for the same row the rest
  // of the dashboard targets.
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
  const link = links?.[0]
  if (!link) {
    return NextResponse.json({
      ok: true,
      unread_total: 0,
      unread_safety: 0,
      latest_guest_reply_at: null,
    })
  }

  // Two cheap queries in parallel. Replies query uses the admin
  // client (RLS no-read on this table); scoped strictly to the
  // resolved campground_id so we never read outside the owner's
  // authorized scope. Single-row pick via .limit(1) + .order so we
  // don't drag a wide reply list across the wire just to compute a
  // max timestamp.
  const admin = createSupabaseAdminClient()
  const [
    { data: countsData, error: countsError },
    { data: replyRows, error: replyError },
  ] = await Promise.all([
    supabase.rpc('owner_message_counts', {
      _campground_id: link.campground_id,
    }),
    admin
      .from('campground_message_replies')
      .select('created_at')
      .eq('campground_id', link.campground_id)
      .eq('sender_type', 'guest')
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<ReplyTsRow[]>(),
  ])

  if (countsError) {
    // Log + return zeros so the badge defaults to no-unread on a
    // transient RPC failure. Reply timestamp also zeroed so the
    // toaster doesn't fire spuriously on the next successful poll.
    console.error(
      '[api/owner/message-counts] counts RPC failed:',
      countsError.message,
    )
    return NextResponse.json(
      {
        ok: false,
        unread_total: 0,
        unread_safety: 0,
        latest_guest_reply_at: null,
      },
      { status: 500 },
    )
  }
  if (replyError) {
    // Reply read failure is non-fatal -- still serve the unread
    // counts. The toaster just won't fire on reply activity until
    // the next successful poll.
    console.error(
      '[api/owner/message-counts] reply ts read failed:',
      replyError.message,
    )
  }

  // supabase-js's .rpc() return-type inference doesn't always pick
  // up "returns table(...)" as set-returning. Cast through unknown
  // to get an array we can index. Runtime: PostgREST always returns
  // the table function as an array, so the cast is sound.
  const rows = (countsData as unknown as CountsRow[] | null) ?? []
  const row = rows[0]
  const latestReplyAt =
    Array.isArray(replyRows) && replyRows.length > 0
      ? replyRows[0]?.created_at ?? null
      : null

  return NextResponse.json({
    ok: true,
    unread_total: Number(row?.unread_total ?? 0),
    unread_safety: Number(row?.unread_safety ?? 0),
    latest_guest_reply_at: latestReplyAt,
  })
}

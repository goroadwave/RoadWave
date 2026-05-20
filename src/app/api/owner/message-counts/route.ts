import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Returns the current unread + unread-safety counts for the owner's
// most-recent campground. Used by:
//   * OwnerMessageBadge (in the top nav) to render the amber/red
//     unread pill + pulse animation.
//   * OwnerMessageToaster to detect fresh increments since the last
//     poll and fire a toast notification.
//
// Auth: cookie session must belong to an authed owner. The
// owner_message_counts RPC is SECURITY DEFINER + gated by
// campground_admins membership, so a forged or unauthorized
// campground_id (or a missing one) returns zeros, never another
// owner's counts.
//
// Output: { ok: true, unread_total: number, unread_safety: number }
// On error / no campground / unauthenticated: { ok: false, ... } with
// safe-default zeros so the polling client never throws and the
// badge defaults to "no unread."

type CountsRow = {
  unread_total: number | string
  unread_safety: number | string
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { ok: false, unread_total: 0, unread_safety: 0 },
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
    })
  }

  // supabase-js's .rpc() return-type inference doesn't always pick
  // up "returns table(...)" as set-returning. Cast through unknown to
  // get an array we can index. Runtime: PostgREST always returns the
  // table function as an array, so the cast is sound.
  const { data, error } = await supabase.rpc('owner_message_counts', {
    _campground_id: link.campground_id,
  })
  if (error) {
    // Log + return zeros so the badge defaults to no-unread on a
    // transient RPC failure.
    console.error('[api/owner/message-counts] RPC failed:', error.message)
    return NextResponse.json(
      { ok: false, unread_total: 0, unread_safety: 0 },
      { status: 500 },
    )
  }

  const rows = (data as unknown as CountsRow[] | null) ?? []
  const row = rows[0]
  return NextResponse.json({
    ok: true,
    unread_total: Number(row?.unread_total ?? 0),
    unread_safety: Number(row?.unread_safety ?? 0),
  })
}

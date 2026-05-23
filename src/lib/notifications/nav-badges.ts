// Per-category unread notification counts for the signed-in AppNav.
// Reads from public.notifications (populated by the mig 0025 triggers
// on waves / matches / messages / bulletins / meetups). RLS scopes
// results to auth.uid() automatically.
//
// Counts are returned in an object keyed by AppNav tab category so
// the nav can render a badge per tab without each tab having to
// know about the underlying notification type strings.
//
// Read/dismiss model (per the 2026-05-23 notification UX spec):
//   * Visiting a page does NOT auto-mark notifications read. The
//     badge stays until the camper explicitly clicks the underlying
//     notification in the Lantern (or hits "Mark all as read").
//   * Dismissing a toast popup does NOT mark the underlying
//     notification record read either. Toasts and Lantern entries
//     are separate surfaces of the same record.

import type { SupabaseClient } from '@supabase/supabase-js'

export type NavBadgeCounts = {
  bulletins: number
  meetups: number
  waves: number
  pastWaves: number
}

export const ZERO_BADGE_COUNTS: NavBadgeCounts = {
  bulletins: 0,
  meetups: 0,
  waves: 0,
  pastWaves: 0,
}

// Notification.type values mapped to AppNav categories. See
// AppLantern's NotificationType union for the full enum; these are
// the ones that drive nav badges.
//
// Intentionally NOT included:
//   * wave_sent -- sender confirmation; no follow-up needed.
//   * (anything else not yet wired) -- additive only, never throw on
//     unknown types so a future trigger that adds a new type doesn't
//     break the badge derivation.
const BULLETINS_TYPES = new Set(['bulletin'])
const MEETUPS_TYPES = new Set(['meetup_invite', 'meetup_rsvp'])
const WAVES_TYPES = new Set(['wave_received', 'wave_matched'])
const PAST_WAVES_TYPES = new Set(['new_message', 'wave_connected'])

export async function loadNavBadgeCounts(
  supabase: SupabaseClient,
): Promise<NavBadgeCounts> {
  // Single round-trip: pull just the type column for all unread
  // notifications. The notifications table is bounded per user (the
  // mig 0025 triggers don't generate massive volume) so reading all
  // unread types is cheaper than four separate count(*) queries.
  const { data, error } = await supabase
    .from('notifications')
    .select('type')
    .eq('is_read', false)
    .limit(500)
  if (error || !data) return ZERO_BADGE_COUNTS

  const counts: NavBadgeCounts = { ...ZERO_BADGE_COUNTS }
  for (const row of data as { type: string }[]) {
    if (BULLETINS_TYPES.has(row.type)) counts.bulletins += 1
    else if (MEETUPS_TYPES.has(row.type)) counts.meetups += 1
    else if (WAVES_TYPES.has(row.type)) counts.waves += 1
    else if (PAST_WAVES_TYPES.has(row.type)) counts.pastWaves += 1
    // Unknown types intentionally ignored -- additive-only.
  }
  return counts
}

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Structured reason codes for "why can't this camper wave at that
// camper". Mirrors the waves_insert_targeted RLS clauses from mig
// 0033 plus the table-level CHECK and UNIQUE constraints from mig
// 0001. The generic "row-level security" error string the supabase
// client returns is opaque; this lets the UI surface an actionable
// message AND lets the hub-page query pre-filter ineligible cards so
// no camper ever sees an active Send a Wave button that fails on
// click.
//
// Codes (additive only -- never reuse a name, never drop one):
//   * ok                         -- insert will succeed
//   * same_user                  -- target IS the caller
//   * sender_missing_profile     -- caller has no profiles row
//   * sender_invisible           -- caller's privacy_mode is not in
//                                   ('visible','quiet') -- matches the
//                                   RLS sender clause
//   * recipient_missing_profile  -- target has no profiles row
//   * recipient_not_visible      -- target's privacy_mode != 'visible'
//   * no_shared_active_checkin   -- viewer + target are not both
//                                   currently checked in to the same
//                                   campground (covers expired
//                                   check_ins, cross-campground stale
//                                   presence, and the campground
//                                   mismatch race)
//   * already_waved              -- the (from, to) unique constraint
//                                   would conflict
//   * already_matched            -- crossed_paths row exists in any
//                                   status (UI should be on Matched +
//                                   Say Hi, not Send a Wave)
//   * recipient_blocked          -- reserved; no block list in today's
//                                   schema but the UI handles it so a
//                                   future migration can light it up
//                                   without a code change here
//   * wrong_id                   -- target_id is malformed / null
//   * rls_denied                 -- catch-all when this function returns
//                                   "ok" but the actual insert still
//                                   rejects under RLS. Means the rules
//                                   in this file have drifted from the
//                                   live RLS policy -- the action logs
//                                   the row so we can patch.

export type WaveEligibilityReason =
  | 'ok'
  | 'same_user'
  | 'sender_missing_profile'
  | 'sender_invisible'
  | 'recipient_missing_profile'
  | 'recipient_not_visible'
  | 'no_shared_active_checkin'
  | 'already_waved'
  | 'already_matched'
  | 'recipient_blocked'
  | 'wrong_id'
  | 'rls_denied'

export type WaveEligibility = {
  ok: boolean
  reason: WaveEligibilityReason
}

// Human-readable copy keyed by reason. Used by both the WaveButton
// (ineligible state) and the sendWaveAction error path. Keep these
// short -- they render under a camper card. Avoid blame language;
// the camper viewing the card has done nothing wrong.
export const WAVE_REASON_COPY: Record<WaveEligibilityReason, string> = {
  ok: '',
  same_user: 'This is your own card.',
  sender_missing_profile:
    'Finish setting up your profile to wave at other campers.',
  sender_invisible:
    "You're in Invisible / Updates Only mode — switch to Visible or Quiet to send a wave.",
  recipient_missing_profile:
    "This camper hasn't finished setting up their profile yet.",
  recipient_not_visible: 'This camper is not accepting waves right now.',
  no_shared_active_checkin:
    "This camper's check-in just expired. Refresh to update the list.",
  already_waved: 'Wave already sent — check your Lantern for updates.',
  already_matched: 'You already matched — open the conversation to say hi.',
  recipient_blocked: 'This camper is no longer reachable.',
  wrong_id: 'Could not identify this camper. Refresh the list.',
  rls_denied:
    "You can't wave at this camper right now — refresh the list and try again.",
}

// Privacy modes the waves_insert_targeted RLS accepts on the sender
// side. Anything outside this set blocks the insert.
const SENDER_OK_MODES = new Set(['visible', 'quiet'])

type ProfileRow = {
  id: string
  privacy_mode: string | null
}

type CheckInRow = {
  campground_id: string
  expires_at: string
  status: string
}

// Compute eligibility for the (viewer, target, campground) tuple.
// Uses the admin client to bypass the profiles_select_own / matched
// RLS so we can see the target's privacy_mode pre-match -- the same
// privilege the security-definer nearby_campers RPC has. Caller is
// trusted: the sendWaveAction validates auth.getUser() first AND the
// hub page only calls this for camper IDs the nearby_campers RPC
// already returned (which means RLS has already cleared a basic
// visibility check).
export async function computeWaveEligibility(
  viewerId: string,
  targetId: string,
  campgroundId: string,
): Promise<WaveEligibility> {
  if (!targetId) return { ok: false, reason: 'wrong_id' }
  if (viewerId === targetId) return { ok: false, reason: 'same_user' }

  const admin = createSupabaseAdminClient()

  // Pull viewer + target profile rows in one round-trip.
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, privacy_mode')
    .in('id', [viewerId, targetId])
    .returns<ProfileRow[]>()
  const profiles = new Map<string, ProfileRow>(
    (profileRows ?? []).map((p) => [p.id, p]),
  )
  const viewer = profiles.get(viewerId)
  const target = profiles.get(targetId)
  if (!viewer || viewer.privacy_mode == null) {
    return { ok: false, reason: 'sender_missing_profile' }
  }
  if (!SENDER_OK_MODES.has(viewer.privacy_mode)) {
    return { ok: false, reason: 'sender_invisible' }
  }
  if (!target || target.privacy_mode == null) {
    return { ok: false, reason: 'recipient_missing_profile' }
  }
  if (target.privacy_mode !== 'visible') {
    return { ok: false, reason: 'recipient_not_visible' }
  }

  // Shared active check-in at the SAME campground the hub page is
  // viewing. The live waves_insert_targeted RLS (mig 0033) only
  // requires ANY shared campground, but the UI tapped a card on a
  // specific campground -- if those don't match, the card is stale
  // and should be retired rather than silently rerouted.
  const nowIso = new Date().toISOString()
  const { data: checkinRows } = await admin
    .from('check_ins')
    .select('campground_id, expires_at, status, profile_id')
    .in('profile_id', [viewerId, targetId])
    .eq('campground_id', campgroundId)
    .eq('status', 'active')
    .gt('expires_at', nowIso)
    .returns<(CheckInRow & { profile_id: string })[]>()
  const checkins = checkinRows ?? []
  const viewerHasCheckin = checkins.some((c) => c.profile_id === viewerId)
  const targetHasCheckin = checkins.some((c) => c.profile_id === targetId)
  if (!viewerHasCheckin || !targetHasCheckin) {
    return { ok: false, reason: 'no_shared_active_checkin' }
  }

  // Already waved? The waves unique (from_profile_id, to_profile_id)
  // constraint will reject a duplicate insert with 23505. Catching
  // it here lets the UI render the right state pill.
  const { data: existingWave } = await admin
    .from('waves')
    .select('id')
    .eq('from_profile_id', viewerId)
    .eq('to_profile_id', targetId)
    .limit(1)
    .maybeSingle<{ id: string }>()
  if (existingWave) return { ok: false, reason: 'already_waved' }

  // Already matched? crossed_paths rows are canonicalized to (min,
  // max) profile ids by the mutual-wave trigger.
  const [a, b] =
    viewerId < targetId ? [viewerId, targetId] : [targetId, viewerId]
  const { data: existingMatch } = await admin
    .from('crossed_paths')
    .select('id, status')
    .eq('profile_a_id', a)
    .eq('profile_b_id', b)
    .limit(1)
    .maybeSingle<{ id: string; status: string }>()
  if (existingMatch) return { ok: false, reason: 'already_matched' }

  return { ok: true, reason: 'ok' }
}

// Batched variant: compute eligibility for many targets in one shot.
// Used by the hub-page query so each camper card knows up front
// whether its Send a Wave button should be active. Returns a map
// keyed by target profile_id so the caller can render disabled
// states without extra round-trips.
//
// Implementation note: keeps the four admin queries simple .in() /
// .eq() filters -- nested .or(and(...),and(...)) syntax was producing
// 19s+ hub renders against the live database. Crossed_paths reads
// every row referencing the viewer once (the viewer's match graph is
// small, single-digit rows for a typical camper), then we filter
// client-side. Same with waves -- only the viewer's outgoing waves.
export async function computeWaveEligibilityBatch(
  viewerId: string,
  targetIds: string[],
  campgroundId: string,
): Promise<Map<string, WaveEligibility>> {
  const out = new Map<string, WaveEligibility>()
  if (targetIds.length === 0) return out
  const unique = Array.from(new Set(targetIds.filter((id) => id !== viewerId)))
  if (unique.length === 0) return out

  const admin = createSupabaseAdminClient()
  const nowIso = new Date().toISOString()
  const targetSet = new Set(unique)

  const [
    { data: profileRows },
    { data: checkinRows },
    { data: outgoingWaves },
    { data: matches },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, privacy_mode')
      .in('id', [viewerId, ...unique])
      .returns<ProfileRow[]>(),
    admin
      .from('check_ins')
      .select('campground_id, expires_at, status, profile_id')
      .in('profile_id', [viewerId, ...unique])
      .eq('campground_id', campgroundId)
      .eq('status', 'active')
      .gt('expires_at', nowIso)
      .returns<(CheckInRow & { profile_id: string })[]>(),
    admin
      .from('waves')
      .select('to_profile_id')
      .eq('from_profile_id', viewerId)
      .in('to_profile_id', unique)
      .returns<{ to_profile_id: string }[]>(),
    // Crossed_paths: fetch every row touching the viewer. The viewer's
    // match graph is small enough that scanning client-side is faster
    // than building a multi-AND filter that PostgREST struggles to
    // plan. Two simple .eq() reads in parallel cover both canonical
    // positions (profile_a_id or profile_b_id).
    Promise.all([
      admin
        .from('crossed_paths')
        .select('profile_a_id, profile_b_id, status')
        .eq('profile_a_id', viewerId)
        .returns<
          { profile_a_id: string; profile_b_id: string; status: string }[]
        >(),
      admin
        .from('crossed_paths')
        .select('profile_a_id, profile_b_id, status')
        .eq('profile_b_id', viewerId)
        .returns<
          { profile_a_id: string; profile_b_id: string; status: string }[]
        >(),
    ]).then(([asA, asB]) => ({
      data: [...(asA.data ?? []), ...(asB.data ?? [])],
    })),
  ])

  const profiles = new Map<string, ProfileRow>(
    (profileRows ?? []).map((p) => [p.id, p]),
  )
  const viewer = profiles.get(viewerId)
  const viewerOk =
    !!viewer &&
    viewer.privacy_mode != null &&
    SENDER_OK_MODES.has(viewer.privacy_mode)
  // Diagnostic: surface the exact sender-state the eligibility check
  // sees when it would block. Visible in Vercel runtime logs. The
  // schema defaults privacy_mode to 'visible' and is NOT NULL, so a
  // viewer who renders the camper card but lands here means either
  // (a) the handle_new_user trigger never fired for this OAuth user
  // (admin lookup returns no row), or (b) the camper saved a
  // privacy_mode value outside SENDER_OK_MODES via /profile/setup.
  // Either way we want the row state in the logs to confirm before
  // changing schema or UI defaults.
  if (!viewerOk) {
    console.log(
      `[wave-eligibility] viewer ineligible uid=${viewerId} row=${
        viewer ? 'found' : 'MISSING'
      } privacy_mode=${viewer?.privacy_mode ?? 'NULL'}`,
    )
  }
  const viewerCheckinOk = (checkinRows ?? []).some(
    (c) => c.profile_id === viewerId,
  )
  const checkinsByProfile = new Set(
    (checkinRows ?? []).map((c) => c.profile_id),
  )
  const wavedTargets = new Set(
    (outgoingWaves ?? []).map((w) => w.to_profile_id),
  )
  const matchedTargets = new Set<string>()
  for (const m of matches ?? []) {
    const other = m.profile_a_id === viewerId ? m.profile_b_id : m.profile_a_id
    if (targetSet.has(other)) matchedTargets.add(other)
  }

  for (const targetId of unique) {
    let reason: WaveEligibilityReason = 'ok'
    if (!viewer || viewer.privacy_mode == null) {
      reason = 'sender_missing_profile'
    } else if (!viewerOk) {
      reason = 'sender_invisible'
    } else {
      const target = profiles.get(targetId)
      if (!target || target.privacy_mode == null) {
        reason = 'recipient_missing_profile'
      } else if (target.privacy_mode !== 'visible') {
        reason = 'recipient_not_visible'
      } else if (!viewerCheckinOk || !checkinsByProfile.has(targetId)) {
        reason = 'no_shared_active_checkin'
      } else if (wavedTargets.has(targetId)) {
        reason = 'already_waved'
      } else if (matchedTargets.has(targetId)) {
        reason = 'already_matched'
      }
    }
    out.set(targetId, { ok: reason === 'ok', reason })
  }

  return out
}

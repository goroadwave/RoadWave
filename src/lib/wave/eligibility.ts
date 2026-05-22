import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  WAVE_REASON_COPY,
  type WaveEligibility,
  type WaveEligibilityReason,
} from '@/lib/wave/reason-copy'

// Re-export so existing callers (sendWaveAction, etc.) that import
// from '@/lib/wave/eligibility' keep working. Client components like
// WaveButton should import directly from '@/lib/wave/reason-copy' to
// avoid pulling in the server-only Supabase clients below.
export { WAVE_REASON_COPY }
export type { WaveEligibility, WaveEligibilityReason }

// Structured reason codes for "why can't this camper wave at that
// camper". Mirrors the waves_insert_targeted RLS clauses from mig
// 0033 plus the table-level CHECK and UNIQUE constraints from mig
// 0001. See reason-copy.ts for the type and the human-readable copy.

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
  const userScoped = await createSupabaseServerClient()

  // Viewer's own row goes through the user-scoped client (always
  // visible via profiles_select_own RLS); the target goes through
  // admin (pre-match the user-scoped client can't see it). See the
  // batch variant below for the bug this routes around.
  const [{ data: viewer }, { data: target }] = await Promise.all([
    userScoped
      .from('profiles')
      .select('id, privacy_mode')
      .eq('id', viewerId)
      .maybeSingle<ProfileRow>(),
    admin
      .from('profiles')
      .select('id, privacy_mode')
      .eq('id', targetId)
      .maybeSingle<ProfileRow>(),
  ])
  if (!viewer || viewer.privacy_mode == null) {
    return { ok: false, reason: 'sender_missing_profile' }
  }
  if (!SENDER_OK_MODES.has(viewer.privacy_mode)) {
    return { ok: false, reason: 'sender_invisible' }
  }
  // Recipient privacy check. Same nearby_campers contract argument
  // applies here as in the batch path: the caller clicked a card that
  // nearby_campers returned, so the target IS visible. If the admin
  // lookup misses the row, fall through to the shared-checkin gate
  // instead of rejecting. See the batch variant below for the full
  // explanation. The shared-checkin check below is the real safety
  // gate (check_ins.profile_id has an FK to profiles.id).
  if (target && target.privacy_mode == null) {
    return { ok: false, reason: 'recipient_missing_profile' }
  }
  if (target && target.privacy_mode !== 'visible') {
    return { ok: false, reason: 'recipient_not_visible' }
  }
  if (!target) {
    console.log(
      `[wave-eligibility] admin missed target row (single) uid=${viewerId} target=${targetId}`,
    )
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
  // The viewer's own row is read via the user-scoped client. The
  // profiles_select_own RLS policy (mig 0015) guarantees the caller
  // always sees their own row, and /home + /profile/setup both prove
  // the row exists from that path. The admin client's bulk .in(...)
  // lookup has been observed (RoadMark, 2026-05-22) to miss the
  // viewer's row even when the user-scoped read finds it -- root
  // cause unconfirmed; possibly a connection-pool view race or a
  // mismatch between user.id casing/format and what the admin client
  // is querying. Reading the viewer's row via the user-scoped client
  // routes around it entirely. Targets still go through admin because
  // pre-match the user-scoped client can't see them.
  const userScoped = await createSupabaseServerClient()
  const nowIso = new Date().toISOString()
  const targetSet = new Set(unique)

  const [
    { data: viewerOwn },
    { data: targetProfileRows },
    { data: checkinRows },
    { data: outgoingWaves },
    { data: matches },
  ] = await Promise.all([
    userScoped
      .from('profiles')
      .select('id, privacy_mode')
      .eq('id', viewerId)
      .maybeSingle<ProfileRow>(),
    admin
      .from('profiles')
      .select('id, privacy_mode')
      .in('id', unique)
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

  // Targets keyed by id. Viewer is intentionally NOT in this map --
  // it now comes from the user-scoped lookup above.
  const targetProfiles = new Map<string, ProfileRow>(
    (targetProfileRows ?? []).map((p) => [p.id, p]),
  )
  const viewer = viewerOwn ?? null
  const viewerOk =
    !!viewer &&
    viewer.privacy_mode != null &&
    SENDER_OK_MODES.has(viewer.privacy_mode)
  // Diagnostic: when the viewer fails the sender check, log the exact
  // shape we saw from both clients so we can finally pin down the
  // RoadMark report (admin missed the row, user-scoped found it -- or
  // didn't). Includes the viewer's id so it can be cross-referenced
  // against profiles in Supabase Studio.
  if (!viewerOk) {
    console.log(
      `[wave-eligibility] viewer ineligible uid=${viewerId} ` +
        `userScopedRow=${viewerOwn ? 'found' : 'MISSING'} ` +
        `userScopedPrivacy=${viewerOwn?.privacy_mode ?? 'NULL'} ` +
        `targetCount=${unique.length} ` +
        `targetRowsReturned=${targetProfileRows?.length ?? 0}`,
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

  let loggedMissingTarget = false
  for (const targetId of unique) {
    let reason: WaveEligibilityReason = 'ok'
    if (!viewer || viewer.privacy_mode == null) {
      reason = 'sender_missing_profile'
    } else if (!viewerOk) {
      reason = 'sender_invisible'
    } else {
      const target = targetProfiles.get(targetId)
      // Recipient privacy check. The targetIds passed in came from
      // nearby_campers, a SECURITY DEFINER SQL function (mig 0001:538)
      // that ALREADY filters by `p.privacy_mode = 'visible'` AND an
      // active shared check-in. So any id we see here is guaranteed
      // to be a visible camper checked in at this campground. If the
      // admin .in() lookup returns no row for it (we've seen the
      // admin client miss rows that nearby_campers + the identity
      // enrichment admin query both find), trust the RPC contract --
      // fall through to the check_ins + waves + matches gates rather
      // than rejecting the wave. The real safety check is the
      // check_ins lookup below: the target needs an active check_in
      // row at this campground, and check_ins.profile_id has an FK
      // to profiles.id so the camper IS a real profile.
      if (target && target.privacy_mode == null) {
        // Schema is NOT NULL DEFAULT 'visible' so this is
        // schema-violating data, not the admin-miss case.
        reason = 'recipient_missing_profile'
      } else if (target && target.privacy_mode !== 'visible') {
        reason = 'recipient_not_visible'
      } else if (!viewerCheckinOk || !checkinsByProfile.has(targetId)) {
        reason = 'no_shared_active_checkin'
      } else if (wavedTargets.has(targetId)) {
        reason = 'already_waved'
      } else if (matchedTargets.has(targetId)) {
        reason = 'already_matched'
      }
      // Log the admin-miss once per batch so we can see whether the
      // problem is the whole result set (root cause = admin client
      // misconfig / connection-pool issue) or a sporadic single id.
      if (!target && !loggedMissingTarget) {
        loggedMissingTarget = true
        console.log(
          `[wave-eligibility] admin missed target rows uid=${viewerId} ` +
            `targetCount=${unique.length} ` +
            `targetRowsReturned=${targetProfileRows?.length ?? 0} ` +
            `firstMissing=${targetId}`,
        )
      }
    }
    out.set(targetId, { ok: reason === 'ok', reason })
  }

  return out
}

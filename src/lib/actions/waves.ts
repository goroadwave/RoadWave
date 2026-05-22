'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'
import {
  computeWaveEligibility,
  WAVE_REASON_COPY,
  type WaveEligibilityReason,
} from '@/lib/wave/eligibility'

export type WaveResult = {
  error: string | null
  /** Structured reason code so the UI can render specific recovery
   *  copy (or hide a card entirely) instead of repeating the generic
   *  "privacy or check-in rules" string. See WAVE_REASON_COPY for
   *  the human-readable strings keyed by code. */
  reason?: WaveEligibilityReason
  matched: boolean
  /** The newly-created crossed_paths.id when the wave produced a
   *  mutual match. Lets the camper-card WaveButton render the
   *  "Say Hi →" deep-link without waiting for a server refresh. */
  crossedPathId?: string | null
}

// Why this action uses the ADMIN client for the actual INSERT
// (after preflight) — found 2026-05-22:
//
// The waves_insert_targeted RLS policy (mig 0033) has a sub-select
// that reads the target's profiles row:
//   `(select privacy_mode from public.profiles where id = waves.to_profile_id) = 'visible'`
//
// PostgreSQL RLS recurses into sub-selects: that read goes through
// the profiles RLS, which on the authenticated role only allows
// SELECT for the caller's OWN row or a MATCHED counterpart's row
// (profiles_select_own / profiles_select_matched / profiles_select_admin).
// Pre-match, the target's profiles row is invisible to the sender,
// so the sub-select returns NULL, `NULL = 'visible'` evaluates to
// NULL, and the entire wave INSERT policy short-circuits to false.
//
// Two paths to fix:
//   (a) DB migration: replace the inline sub-select with a
//       security-definer helper function so the policy can see the
//       target's profile. Permanent fix; requires manual `supabase
//       db push` since CI doesn't apply migrations.
//   (b) THIS path: keep RLS as-is, but route the INSERT through the
//       admin client AFTER computeWaveEligibility (which uses the
//       admin client too and mirrors EVERY clause the RLS enforces)
//       has approved it. The admin client bypasses RLS, but the
//       privacy invariants the RLS protects are still enforced --
//       the preflight is the sole gate and it's a strict superset
//       of the RLS check (campground binding is stricter, all the
//       privacy / consent / already-waved / already-matched checks
//       are present).
//
// Authority invariant: `from_profile_id` is ALWAYS set from
// supabase.auth.getUser().id BEFORE any admin-client write, so an
// attacker can't spoof their identity by passing a different
// from_profile_id -- the action validates auth first and the
// targetId/campgroundId are the only inputs the caller controls.

export async function sendWaveAction(
  targetId: string,
  campgroundId: string,
): Promise<WaveResult> {
  if (!isUuid(targetId) || !isUuid(campgroundId)) {
    return {
      error: WAVE_REASON_COPY.wrong_id,
      reason: 'wrong_id',
      matched: false,
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: 'Not signed in.',
      reason: 'sender_missing_profile',
      matched: false,
    }
  }

  // Pre-flight: mirror every clause of waves_insert_targeted (mig
  // 0033) + the table-level CHECK / UNIQUE constraints (mig 0001).
  // Uses the admin client so it can see the target's profile
  // pre-match (the same vantage point the eventual INSERT will use).
  const elig = await computeWaveEligibility(user.id, targetId, campgroundId)
  if (!elig.ok) {
    await logWaveDenial({
      stage: 'preflight',
      reason: elig.reason,
      viewerId: user.id,
      targetId,
      campgroundId,
    })
    return {
      error: WAVE_REASON_COPY[elig.reason],
      reason: elig.reason,
      matched: false,
    }
  }

  // INSERT via admin client. See header comment above for why the
  // user's client can't do this directly. The privacy gates that
  // RLS would have enforced are already enforced by
  // computeWaveEligibility above -- this is bypassing the RLS
  // policy, not the privacy contract.
  const admin = createSupabaseAdminClient()
  const { error: insertError } = await admin.from('waves').insert({
    from_profile_id: user.id,
    to_profile_id: targetId,
    campground_id: campgroundId,
  })

  if (insertError) {
    // Translate the common Postgres error codes into reasons so the
    // UI surfaces specific copy. 23505 = unique violation (already
    // waved), 23514 = check constraint (self-wave). Any other code
    // is genuinely unexpected since the admin client bypasses RLS.
    if (insertError.code === '23505') {
      await logWaveDenial({
        stage: 'insert',
        reason: 'already_waved',
        viewerId: user.id,
        targetId,
        campgroundId,
        rawError: insertError.message,
      })
      return {
        error: WAVE_REASON_COPY.already_waved,
        reason: 'already_waved',
        matched: false,
      }
    }
    if (insertError.code === '23514') {
      await logWaveDenial({
        stage: 'insert',
        reason: 'same_user',
        viewerId: user.id,
        targetId,
        campgroundId,
        rawError: insertError.message,
      })
      return {
        error: WAVE_REASON_COPY.same_user,
        reason: 'same_user',
        matched: false,
      }
    }
    // Anything else is a real surprise -- emit the full diagnostic
    // bundle so we can figure out what changed.
    await logWaveDenial({
      stage: 'insert',
      reason: 'rls_denied',
      viewerId: user.id,
      targetId,
      campgroundId,
      rawError: insertError.message,
      rawCode: insertError.code ?? null,
    })
    return {
      error: WAVE_REASON_COPY.rls_denied,
      reason: 'rls_denied',
      matched: false,
    }
  }

  // Did the trigger create a crossed_paths row? (i.e. is this a mutual match?)
  const [a, b] = user.id < targetId ? [user.id, targetId] : [targetId, user.id]
  const { data: cp } = await admin
    .from('crossed_paths')
    .select('id')
    .eq('profile_a_id', a)
    .eq('profile_b_id', b)
    .maybeSingle<{ id: string }>()

  revalidatePath('/nearby')
  revalidatePath('/crossed-paths')
  revalidatePath('/waves')

  return {
    error: null,
    matched: !!cp,
    crossedPathId: cp?.id ?? null,
  }
}

// Verbose diagnostic logger. Dumps every field the wave-eligibility
// audit (2026-05-22) called for so a repeat of the "RLS denial after
// preflight ok" surprise can be traced in Vercel logs without
// re-instrumenting the action. Best-effort: any failure inside this
// logger is swallowed so a logging fault never breaks the wave path.
async function logWaveDenial(opts: {
  stage: 'preflight' | 'insert'
  reason: WaveEligibilityReason
  viewerId: string
  targetId: string
  campgroundId: string
  rawError?: string
  rawCode?: string | null
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()
    const nowIso = new Date().toISOString()

    const [
      { data: senderProfile },
      { data: targetProfile },
      { data: senderCheckins },
      { data: targetCheckins },
      { data: existingWave },
      { data: existingMatch },
    ] = await Promise.all([
      admin
        .from('profiles')
        .select(
          'id, privacy_mode, suspended_at, display_name, username, email_verified_at',
        )
        .eq('id', opts.viewerId)
        .maybeSingle(),
      admin
        .from('profiles')
        .select(
          'id, privacy_mode, suspended_at, display_name, username, email_verified_at',
        )
        .eq('id', opts.targetId)
        .maybeSingle(),
      admin
        .from('check_ins')
        .select(
          'id, campground_id, status, expires_at, checked_in_at',
        )
        .eq('profile_id', opts.viewerId)
        .order('checked_in_at', { ascending: false })
        .limit(5),
      admin
        .from('check_ins')
        .select(
          'id, campground_id, status, expires_at, checked_in_at',
        )
        .eq('profile_id', opts.targetId)
        .order('checked_in_at', { ascending: false })
        .limit(5),
      admin
        .from('waves')
        .select('id, status, sent_at, campground_id')
        .eq('from_profile_id', opts.viewerId)
        .eq('to_profile_id', opts.targetId)
        .maybeSingle(),
      admin
        .from('crossed_paths')
        .select('id, status, matched_at, campground_id')
        .or(
          `and(profile_a_id.eq.${opts.viewerId},profile_b_id.eq.${opts.targetId}),and(profile_a_id.eq.${opts.targetId},profile_b_id.eq.${opts.viewerId})`,
        )
        .maybeSingle(),
    ])

    const senderActiveAtCampground = (senderCheckins ?? []).find(
      (c: any) =>
        c.campground_id === opts.campgroundId &&
        c.status === 'active' &&
        c.expires_at > nowIso,
    )
    const targetActiveAtCampground = (targetCheckins ?? []).find(
      (c: any) =>
        c.campground_id === opts.campgroundId &&
        c.status === 'active' &&
        c.expires_at > nowIso,
    )

    console.log('[wave-debug]', {
      ts: nowIso,
      stage: opts.stage,
      reason: opts.reason,
      rawError: opts.rawError ?? null,
      rawCode: opts.rawCode ?? null,
      sender: {
        auth_uid_from_getUser: opts.viewerId,
        profile: senderProfile,
        active_checkin_at_target_campground: senderActiveAtCampground ?? null,
        all_recent_checkins: senderCheckins ?? [],
      },
      recipient: {
        target_id_from_card: opts.targetId,
        profile: targetProfile,
        active_checkin_at_target_campground: targetActiveAtCampground ?? null,
        all_recent_checkins: targetCheckins ?? [],
      },
      campground_id_passed: opts.campgroundId,
      existing_wave_row: existingWave,
      existing_crossed_paths_row: existingMatch,
    })
  } catch (err) {
    console.warn(
      '[wave-debug] logger threw:',
      err instanceof Error ? err.message : String(err),
    )
  }
}

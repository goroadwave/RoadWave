'use server'

import { revalidatePath } from 'next/cache'
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

  // Pre-flight: mirror the waves_insert_targeted RLS clauses + the
  // table-level CHECK / UNIQUE constraints so the caller can hand
  // back a specific reason instead of the opaque RLS denial. This
  // also catches the page-stale case (target's check-in expired
  // between hub render and wave click) before we waste a write.
  const elig = await computeWaveEligibility(user.id, targetId, campgroundId)
  if (!elig.ok) {
    console.log('[wave-eligibility]', {
      viewer: user.id,
      target: targetId,
      campground: campgroundId,
      reason: elig.reason,
    })
    return {
      error: WAVE_REASON_COPY[elig.reason],
      reason: elig.reason,
      matched: false,
    }
  }

  // RLS still enforces the canonical privacy gates. If we reach
  // here, computeWaveEligibility considered the insert safe; an
  // actual 42501 means our TS rules have drifted from the live RLS
  // policy. We surface that as `rls_denied` so it stands out in
  // logs.
  const { error: insertError } = await supabase.from('waves').insert({
    from_profile_id: user.id,
    to_profile_id: targetId,
    campground_id: campgroundId,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        error: WAVE_REASON_COPY.already_waved,
        reason: 'already_waved',
        matched: false,
      }
    }
    if (insertError.code === '23514') {
      return {
        error: WAVE_REASON_COPY.same_user,
        reason: 'same_user',
        matched: false,
      }
    }
    if (
      insertError.code === '42501' ||
      insertError.message.includes('row-level')
    ) {
      console.warn('[wave-eligibility] rls_denied after preflight ok', {
        viewer: user.id,
        target: targetId,
        campground: campgroundId,
        insertError: insertError.message,
      })
      return {
        error: WAVE_REASON_COPY.rls_denied,
        reason: 'rls_denied',
        matched: false,
      }
    }
    return {
      error: insertError.message,
      reason: 'rls_denied',
      matched: false,
    }
  }

  // Did the trigger create a crossed_paths row? (i.e. is this a mutual match?)
  const [a, b] = user.id < targetId ? [user.id, targetId] : [targetId, user.id]
  const { data: cp } = await supabase
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

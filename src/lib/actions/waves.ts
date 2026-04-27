'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'

export type WaveResult = { error: string | null; matched: boolean }

export async function sendWaveAction(
  targetId: string,
  campgroundId: string,
): Promise<WaveResult> {
  if (!isUuid(targetId) || !isUuid(campgroundId)) {
    return { error: 'Invalid request.', matched: false }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', matched: false }

  if (user.id === targetId) {
    return { error: "You can't wave at yourself.", matched: false }
  }

  // RLS enforces all the privacy gates: not invisible, target is visible,
  // both checked in to the same campground.
  const { error: insertError } = await supabase.from('waves').insert({
    from_profile_id: user.id,
    to_profile_id: targetId,
    campground_id: campgroundId,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return { error: "You've already waved at this person.", matched: false }
    }
    if (insertError.code === '23514') {
      return { error: "You can't wave at yourself.", matched: false }
    }
    if (insertError.code === '42501' || insertError.message.includes('row-level')) {
      return {
        error:
          "You can't wave at this camper right now (privacy or check-in rules).",
        matched: false,
      }
    }
    return { error: insertError.message, matched: false }
  }

  // Did the trigger create a crossed_paths row? (i.e. is this a mutual match?)
  const [a, b] = user.id < targetId ? [user.id, targetId] : [targetId, user.id]
  const { data: cp } = await supabase
    .from('crossed_paths')
    .select('id')
    .eq('profile_a_id', a)
    .eq('profile_b_id', b)
    .maybeSingle()

  revalidatePath('/nearby')
  revalidatePath('/crossed-paths')

  return { error: null, matched: !!cp }
}

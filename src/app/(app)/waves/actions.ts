'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'

export async function removeWaveAction(formData: FormData) {
  const id = formData.get('id')
  if (typeof id !== 'string' || id.length === 0) return

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('waves')
    .delete()
    .eq('id', id)
    .eq('from_profile_id', user.id)

  revalidatePath('/waves')
  revalidatePath('/nearby')
}

export type DeclineWaveResult = { ok: boolean; error: string | null }

export async function declineWaveAction(
  waveId: string,
): Promise<DeclineWaveResult> {
  if (!isUuid(waveId)) return { ok: false, error: 'Invalid wave id.' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { error } = await supabase.rpc('decline_wave', { _wave_id: waveId })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/waves')
  revalidatePath('/home')
  return { ok: true, error: null }
}

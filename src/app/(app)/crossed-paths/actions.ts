'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'

export type SendMessageResult = { ok: boolean; error: string | null }
export type WaveConsentStatus =
  | 'connected'
  | 'pending'
  | 'declined'
  | 'not_found'
  | 'unauthorized'
export type WaveConsentResult = {
  status: WaveConsentStatus | null
  error: string | null
}

export async function waveConsentAction(
  crossedPathId: string,
  connect: boolean,
): Promise<WaveConsentResult> {
  if (!isUuid(crossedPathId))
    return { status: null, error: 'Invalid request.' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: null, error: 'Not signed in.' }

  const { data, error } = await supabase.rpc('wave_consent', {
    _crossed_path_id: crossedPathId,
    _connect: connect,
  })
  if (error) return { status: null, error: error.message }

  revalidatePath('/crossed-paths')
  revalidatePath(`/crossed-paths/${crossedPathId}`)
  revalidatePath('/home')
  return { status: (data as WaveConsentStatus) ?? null, error: null }
}

const schema = z.object({
  crossed_path_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
})

export async function sendCrossedPathMessageAction(
  _prev: SendMessageResult,
  formData: FormData,
): Promise<SendMessageResult> {
  const parsed = schema.safeParse({
    crossed_path_id: formData.get('crossed_path_id'),
    body: (formData.get('body') as string | null)?.trim() ?? '',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first = Object.values(flat.fieldErrors).flat()[0] ?? 'Invalid input.'
    return { ok: false, error: String(first) }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { error } = await supabase.from('crossed_paths_messages').insert({
    crossed_path_id: parsed.data.crossed_path_id,
    sender_id: user.id,
    body: parsed.data.body,
  })
  if (error) {
    console.error('[crossed-paths] insert message failed:', error.message)
    // RLS rejection (sender isn't a participant) lands here too with a
    // permission-denied style error; surface a friendly version.
    return { ok: false, error: error.message }
  }

  revalidatePath(`/crossed-paths/${parsed.data.crossed_path_id}`)
  return { ok: true, error: null }
}

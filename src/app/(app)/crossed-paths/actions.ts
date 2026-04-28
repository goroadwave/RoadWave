'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type SendMessageResult = { ok: boolean; error: string | null }

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

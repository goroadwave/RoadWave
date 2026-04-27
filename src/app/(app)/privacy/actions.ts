'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const schema = z.object({
  privacy_mode: z.enum(['visible', 'quiet', 'invisible']),
})

export type PrivacyState = { error: string | null; ok: boolean }

export async function savePrivacyModeAction(
  _prev: PrivacyState,
  formData: FormData,
): Promise<PrivacyState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  const parsed = schema.safeParse({ privacy_mode: formData.get('privacy_mode') })
  if (!parsed.success) return { error: 'Pick a privacy mode.', ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ privacy_mode: parsed.data.privacy_mode })
    .eq('id', user.id)
  if (error) return { error: error.message, ok: false }

  revalidatePath('/home')
  revalidatePath('/nearby')
  redirect('/home')
}

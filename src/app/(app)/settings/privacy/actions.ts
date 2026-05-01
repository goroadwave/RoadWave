'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const schema = z.object({
  privacy_mode: z.enum(['visible', 'quiet', 'invisible', 'campground_only']),
  // The two sub-toggles only matter for the campground_only mode but
  // we always accept + persist them so the user can pre-set their
  // preference from any mode and have it stick when they switch.
  share_bulletins: z.preprocess(
    (v) => v === 'on' || v === true,
    z.boolean(),
  ),
  share_meetups: z.preprocess(
    (v) => v === 'on' || v === true,
    z.boolean(),
  ),
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

  const parsed = schema.safeParse({
    privacy_mode: formData.get('privacy_mode'),
    share_bulletins: formData.get('share_bulletins'),
    share_meetups: formData.get('share_meetups'),
  })
  if (!parsed.success) return { error: 'Pick a privacy mode.', ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({
      privacy_mode: parsed.data.privacy_mode,
      share_bulletins: parsed.data.share_bulletins,
      share_meetups: parsed.data.share_meetups,
    })
    .eq('id', user.id)
  if (error) return { error: error.message, ok: false }

  revalidatePath('/home')
  revalidatePath('/nearby')
  revalidatePath('/meetups')
  redirect('/home')
}

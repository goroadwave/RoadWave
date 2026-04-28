'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type LogoSaveState = { error: string | null; ok: boolean }

// Persist a public Storage URL onto the campground row after the browser
// uploaded the file directly to Supabase Storage. RLS on storage.objects
// already gates which paths the user can write (see 0009); this action just
// stamps the URL into the campgrounds row, which is owner-RLS protected.
export async function saveLogoUrlAction(
  campgroundId: string,
  url: string,
): Promise<LogoSaveState> {
  if (!url || url.length > 1024) {
    return { ok: false, error: 'Invalid logo URL.' }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('campgrounds')
    .update({ logo_url: url })
    .eq('id', campgroundId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/owner/profile')
  revalidatePath('/owner/dashboard')
  return { ok: true, error: null }
}

export async function clearLogoAction(
  campgroundId: string,
): Promise<LogoSaveState> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('campgrounds')
    .update({ logo_url: null })
    .eq('id', campgroundId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/owner/profile')
  revalidatePath('/owner/dashboard')
  return { ok: true, error: null }
}

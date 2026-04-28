'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Light validation. The DB column is just text[]; we cap lengths and item
// counts so a buggy client can't dump megabytes into a single row.
const filtersSchema = z.object({
  styles: z.array(z.string().min(1).max(64)).max(20),
  interests: z.array(z.string().min(1).max(64)).max(50),
})

export type SaveNearbyFiltersResult = { ok: boolean; error: string | null }

export async function saveNearbyFiltersAction(
  styles: string[],
  interests: string[],
): Promise<SaveNearbyFiltersResult> {
  const parsed = filtersSchema.safeParse({ styles, interests })
  if (!parsed.success) {
    return { ok: false, error: 'Invalid filter selection.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      nearby_filter_styles: parsed.data.styles,
      nearby_filter_interests: parsed.data.interests,
    })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }

  return { ok: true, error: null }
}

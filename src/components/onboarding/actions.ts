'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type OnboardingState = { error: string | null; ok: boolean }

const TRAVEL_STYLES = [
  'full_timer',
  'weekender',
  'snowbird',
  'seasonal_guest',
  'camp_host',
  'work_camper',
  'solo_traveler',
  'traveling_for_work',
  'family_traveler',
  'prefer_quiet',
] as const

const travelStyleSchema = z.enum(TRAVEL_STYLES)
const privacySchema = z.enum(['visible', 'quiet', 'invisible'])
const interestsSchema = z.array(z.string().min(1).max(64)).max(50)

export async function saveOnboardingTravelStyle(
  slug: string,
): Promise<OnboardingState> {
  const parsed = travelStyleSchema.safeParse(slug)
  if (!parsed.success) return { error: 'Pick a travel style.', ok: false }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ travel_style: parsed.data })
    .eq('id', user.id)
  if (error) return { error: error.message, ok: false }

  revalidatePath('/home')
  return { error: null, ok: true }
}

export async function saveOnboardingInterests(
  slugs: string[],
): Promise<OnboardingState> {
  const parsed = interestsSchema.safeParse(slugs)
  if (!parsed.success) return { error: 'Pick a few interests.', ok: false }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  const { error: deleteError } = await supabase
    .from('profile_interests')
    .delete()
    .eq('profile_id', user.id)
  if (deleteError) return { error: deleteError.message, ok: false }

  if (parsed.data.length > 0) {
    const { data: rows } = await supabase
      .from('interests')
      .select('id, slug')
      .in('slug', parsed.data)

    if (rows && rows.length > 0) {
      const { error: insertError } = await supabase
        .from('profile_interests')
        .insert(rows.map((r) => ({ profile_id: user.id, interest_id: r.id })))
      if (insertError) return { error: insertError.message, ok: false }
    }
  }

  revalidatePath('/home')
  revalidatePath('/nearby')
  return { error: null, ok: true }
}

export async function saveOnboardingPrivacy(
  mode: string,
): Promise<OnboardingState> {
  const parsed = privacySchema.safeParse(mode)
  if (!parsed.success) return { error: 'Pick a privacy mode.', ok: false }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  const { error } = await supabase
    .from('profiles')
    .update({ privacy_mode: parsed.data })
    .eq('id', user.id)
  if (error) return { error: error.message, ok: false }

  revalidatePath('/home')
  revalidatePath('/nearby')
  return { error: null, ok: true }
}

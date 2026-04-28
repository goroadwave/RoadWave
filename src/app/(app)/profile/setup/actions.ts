'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validators/profile'

export type ProfileSaveState = { error: string | null; ok: boolean }

export type AvatarSaveState = { error: string | null }

// Called by AvatarUpload after the browser uploads the file directly to
// Supabase Storage. We only persist the URL on the profile row here.
export async function saveAvatarUrlAction(url: string): Promise<AvatarSaveState> {
  if (typeof url !== 'string' || url.length === 0 || url.length > 1024) {
    return { error: 'Invalid avatar URL.' }
  }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/profile/setup')
  revalidatePath('/home')
  revalidatePath('/nearby')
  return { error: null }
}

export async function saveProfileAction(
  _prev: ProfileSaveState,
  formData: FormData,
): Promise<ProfileSaveState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  const parsed = profileSchema.safeParse({
    display_name: formData.get('display_name'),
    rig_type: formData.get('rig_type') ?? '',
    miles_driven: formData.get('miles_driven') ?? '',
    hometown: formData.get('hometown') ?? '',
    status_tag: formData.get('status_tag') ?? '',
    personal_note: formData.get('personal_note') ?? '',
    years_rving: formData.get('years_rving') ?? '',
    has_pets: formData.get('has_pets') === 'on',
    pet_info: formData.get('pet_info') ?? '',
    travel_style: formData.get('travel_style') ?? '',
    privacy_mode: formData.get('privacy_mode'),
    share_rig_type: formData.get('share_rig_type') === 'on',
    share_miles_driven: formData.get('share_miles_driven') === 'on',
    share_hometown: formData.get('share_hometown') === 'on',
    share_status: formData.get('share_status') === 'on',
    share_note: formData.get('share_note') === 'on',
    share_years: formData.get('share_years') === 'on',
    share_pet: formData.get('share_pet') === 'on',
    share_travel_style: formData.get('share_travel_style') === 'on',
    share_interests: formData.get('share_interests') === 'on',
    interest_slugs: formData.getAll('interest_slugs'),
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? 'Invalid input'
    return { error: String(first), ok: false }
  }

  const { interest_slugs, ...profileData } = parsed.data

  const { error: updateError } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id)
  if (updateError) return { error: updateError.message, ok: false }

  // Replace interests: delete all current, insert new selection.
  const { error: deleteError } = await supabase
    .from('profile_interests')
    .delete()
    .eq('profile_id', user.id)
  if (deleteError) return { error: deleteError.message, ok: false }

  if (interest_slugs.length > 0) {
    const { data: rows } = await supabase
      .from('interests')
      .select('id, slug')
      .in('slug', interest_slugs)

    if (rows && rows.length > 0) {
      const { error: insertError } = await supabase
        .from('profile_interests')
        .insert(rows.map((r) => ({ profile_id: user.id, interest_id: r.id })))
      if (insertError) return { error: insertError.message, ok: false }
    }
  }

  revalidatePath('/home')
  redirect('/home')
}

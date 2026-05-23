'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { meetupCreateSchema } from '@/lib/validators/meetups'

export type MeetupCreateState = { error: string | null; ok: boolean }

export async function createMeetupAction(
  _prev: MeetupCreateState,
  formData: FormData,
): Promise<MeetupCreateState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  const parsed = meetupCreateSchema.safeParse({
    campground_id: formData.get('campground_id'),
    title: formData.get('title') ?? '',
    description: formData.get('description') ?? '',
    location: formData.get('location') ?? '',
    start_at: formData.get('start_at') ?? '',
    end_at: formData.get('end_at') ?? '',
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const first =
      Object.values(flat.fieldErrors).flat()[0] ?? flat.formErrors[0] ?? 'Invalid input'
    return { error: String(first), ok: false }
  }

  const { campground_id, title, description, location, start_at, end_at } = parsed.data

  const startISO = new Date(start_at).toISOString()
  const endISO = end_at ? new Date(end_at).toISOString() : null

  const { error } = await supabase.from('meetups').insert({
    campground_id,
    posted_by: user.id,
    title,
    description,
    location,
    start_at: startISO,
    end_at: endISO,
  })
  if (error) {
    if (error.code === '42501' || error.message.includes('row-level')) {
      return { error: 'Only campground hosts can post meetups here.', ok: false }
    }
    return { error: error.message, ok: false }
  }

  revalidatePath('/meetups')
  return { error: null, ok: true }
}

export async function deleteMeetupAction(formData: FormData) {
  const id = formData.get('id')
  if (typeof id !== 'string' || id.length === 0) return

  const supabase = await createSupabaseServerClient()
  await supabase.from('meetups').delete().eq('id', id)
  revalidatePath('/meetups')
}

export type DismissMeetupState = { error: string | null; ok: boolean }

// Per-camper "clear from MY meetups list" action. Inserts a row in
// meetup_dismissals (mig 0061) for (caller, meetup) and marks any
// existing meetup notifications for the same meetup as read so the
// AppNav Meetups badge doesn't keep counting them after dismiss.
//
// Strictly camper-side: never touches the meetup row itself, never
// affects other campers, never affects the owner's view. The
// /meetups page renders the dismiss button on every meetup card --
// hosted-upcoming, camper-upcoming, and past -- so the camper can
// trim their list however they want.
export async function dismissMeetupAction(
  _prev: DismissMeetupState,
  formData: FormData,
): Promise<DismissMeetupState> {
  const id = formData.get('meetup_id')
  if (typeof id !== 'string' || id.length === 0) {
    return { error: 'Missing meetup id.', ok: false }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.', ok: false }

  // Upsert (PK is (user_id, meetup_id)) so a double-tap from a
  // racing client never errors out.
  const { error: dismissError } = await supabase
    .from('meetup_dismissals')
    .upsert(
      { user_id: user.id, meetup_id: id },
      { onConflict: 'user_id,meetup_id' },
    )
  if (dismissError) {
    // If the table doesn't exist yet (migration 0061 not applied),
    // surface the message so the operator knows; the camper-facing
    // form treats it as a soft failure.
    return { error: dismissError.message, ok: false }
  }

  // Clear the related Lantern entries / Meetups nav badge counter.
  // notifications.reference_id holds the meetup_id for both
  // meetup_invite and meetup_rsvp types (mig 0025 trigger). The
  // RLS on notifications scopes the update to auth.uid() rows.
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('reference_id', id)
    .in('type', ['meetup_invite', 'meetup_rsvp'])

  revalidatePath('/meetups')
  return { error: null, ok: true }
}

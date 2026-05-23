'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { meetupCreateSchema } from '@/lib/validators/meetups'

// Echoed back on any error so the form can restore the owner's
// typed values via defaultValue. Without this, the uncontrolled
// inputs reset to empty on each useActionState re-render and the
// owner loses everything they typed on a single bad field.
export type MeetupFormFields = {
  title: string
  location: string
  start_at: string
  end_at: string
  description: string
}

export type MeetupCreateState = {
  error: string | null
  ok: boolean
  // The field whose value was the cause of the validation error,
  // when known. Drives the inline highlight + autofocus on the
  // re-render. null on success or on field-agnostic errors.
  fieldError?: keyof MeetupFormFields | null
  // The raw values the form submitted. Returned on success too
  // (as empty strings) so the form resets cleanly; returned with
  // submitted values on error so nothing is lost.
  fields?: MeetupFormFields
}

const EMPTY_FIELDS: MeetupFormFields = {
  title: '',
  location: '',
  start_at: '',
  end_at: '',
  description: '',
}

function readFormFields(formData: FormData): MeetupFormFields {
  return {
    title: (formData.get('title') as string | null) ?? '',
    location: (formData.get('location') as string | null) ?? '',
    start_at: (formData.get('start_at') as string | null) ?? '',
    end_at: (formData.get('end_at') as string | null) ?? '',
    description: (formData.get('description') as string | null) ?? '',
  }
}

export async function createMeetupAction(
  _prev: MeetupCreateState,
  formData: FormData,
): Promise<MeetupCreateState> {
  // Capture the raw values FIRST so every error path can echo them
  // back. Validation errors, auth errors, and DB errors all return
  // these so the form survives.
  const fields = readFormFields(formData)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not signed in.', ok: false, fields, fieldError: null }
  }

  const parsed = meetupCreateSchema.safeParse({
    campground_id: formData.get('campground_id'),
    ...fields,
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    // Identify the first field-specific error so we can highlight
    // the right input + focus it on re-render. The Zod refine
    // for end_at > start_at carries path: ['end_at'] (see
    // src/lib/validators/meetups.ts), so this picks up "end time
    // must be after start time" automatically.
    const fieldErrorKey = (Object.keys(flat.fieldErrors)[0] ?? null) as
      | keyof MeetupFormFields
      | null
    const first =
      Object.values(flat.fieldErrors).flat()[0] ??
      flat.formErrors[0] ??
      'Invalid input'
    return {
      error: String(first),
      ok: false,
      fields,
      fieldError: fieldErrorKey,
    }
  }

  const {
    campground_id,
    title,
    description,
    location,
    start_at,
    end_at,
  } = parsed.data

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
      return {
        error: 'Only campground hosts can post meetups here.',
        ok: false,
        fields,
        fieldError: null,
      }
    }
    return { error: error.message, ok: false, fields, fieldError: null }
  }

  revalidatePath('/meetups')
  return { error: null, ok: true, fields: EMPTY_FIELDS, fieldError: null }
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

  // Use the SECURITY DEFINER RPC (mig 0062) instead of a direct
  // table write. The direct .from('meetup_dismissals').upsert path
  // was failing with PGRST205 ("Could not find the table in the
  // schema cache") even after mig 0061 successfully created the
  // table -- PostgREST's table cache can get wedged in ways that
  // NOTIFY doesn't always recover from. RPC calls go through a
  // separate code path that reloads more reliably. The function
  // does the same upsert + notification-mark-read in a single
  // transaction, gated on auth.uid() server-side.
  const { error: rpcError } = await supabase.rpc('dismiss_meetup', {
    _meetup_id: id,
  })
  if (rpcError) {
    return { error: rpcError.message, ok: false }
  }

  revalidatePath('/meetups')
  return { error: null, ok: true }
}

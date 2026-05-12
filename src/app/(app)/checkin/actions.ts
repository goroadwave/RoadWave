'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'

export type CheckInState = { error: string | null }

export async function checkInAction(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const token = formData.get('token')
  if (!isUuid(token)) {
    return { error: 'Invalid check-in token.' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('checkin_by_token', { _token: token })
  if (error) {
    if ((error as { code?: string }).code === 'P0002') {
      return { error: 'Please verify your email before checking in.' }
    }
    if ((error as { code?: string }).code === 'P0001') {
      return { error: "That QR doesn't match a known campground." }
    }
    return { error: error.message }
  }

  revalidatePath('/home')
  revalidatePath('/nearby')
  redirect('/nearby')
}

export async function checkOutAction(
  _prev: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const id = formData.get('id')
  if (typeof id !== 'string' || id.length === 0) {
    return { error: 'Missing check-in id.' }
  }

  const supabase = await createSupabaseServerClient()

  // Defense-in-depth: RLS policy `check_ins_update_own` already restricts
  // updates to rows where profile_id = auth.uid(), but pin the filter
  // here too so the auth assumption is visible in code and the action
  // can't silently mutate someone else's check-in if a future migration
  // ever relaxes that RLS policy.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session expired — please sign in again.' }

  const { error } = await supabase
    .from('check_ins')
    .update({ status: 'departed' })
    .eq('id', id)
    .eq('profile_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/checkin')
  revalidatePath('/nearby')
  return { error: null }
}

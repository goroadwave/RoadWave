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
  const { error } = await supabase
    .from('check_ins')
    .update({ status: 'departed' })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/checkin')
  revalidatePath('/nearby')
  return { error: null }
}

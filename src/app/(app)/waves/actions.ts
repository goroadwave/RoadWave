'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function removeWaveAction(formData: FormData) {
  const id = formData.get('id')
  if (typeof id !== 'string' || id.length === 0) return

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Only allow deleting waves you sent. RLS should already enforce this
  // but the explicit from_profile_id filter is belt-and-suspenders.
  await supabase
    .from('waves')
    .delete()
    .eq('id', id)
    .eq('from_profile_id', user.id)

  revalidatePath('/waves')
  revalidatePath('/nearby')
}

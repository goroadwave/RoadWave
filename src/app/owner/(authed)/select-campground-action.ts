'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OWNER_CAMPGROUND_COOKIE } from './_constants'

// Cookie that pins the owner dashboard to a specific campground when
// the owner manages more than one. Cookie name lives in _constants
// because 'use server' files can only export async functions.
// Read by loadOwnerCampground() in _helpers.ts; written here by the
// switcher form.
//
// Validation guarantees the cookie can only ever name a campground
// the user is actually a member of (campground_admins). A user who
// crafts a fake cookie hits the validation no-op and stays on
// whichever campground they were previously viewing.
//
// Cookie scope is /owner so it's not sent on the camper QR pages.
// HttpOnly so client JS can't read/spoof it; the switcher uses a
// server action to mutate it, never document.cookie.

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export async function selectOwnerCampgroundAction(formData: FormData) {
  const campgroundId = formData.get('campground_id')
  if (typeof campgroundId !== 'string' || campgroundId.length === 0) {
    return
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Validate membership BEFORE writing the cookie. RLS on
  // campground_admins already gates SELECTs to self-rows
  // (auth.uid()), so this query naturally returns at most the row
  // matching the supplied id IFF the user owns that campground.
  const { data: membership } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .eq('campground_id', campgroundId)
    .maybeSingle()
  if (!membership) return

  const cookieStore = await cookies()
  cookieStore.set(OWNER_CAMPGROUND_COOKIE, campgroundId, {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/owner',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // Revalidate the whole owner shell so every page (dashboard,
  // messages, bulletin, etc.) re-resolves loadOwnerCampground()
  // with the new selection on next render.
  revalidatePath('/owner', 'layout')
  redirect('/owner/dashboard')
}

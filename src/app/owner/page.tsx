import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// /owner is a router. Owners → dashboard. Guests → /checkin (per spec).
// Anonymous → login.
export default async function OwnerRoot() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'guest') redirect('/checkin')

  // OAuth signups land here without a campground link — send them to setup.
  // Use .limit(1) on an array (not .maybeSingle()) so an owner with 2+
  // campgrounds doesn't silently get null and bounce to /owner/setup,
  // which previously created the setup ↔ dashboard redirect loop.
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .limit(1)
  if (!links || links.length === 0) redirect('/owner/setup')

  redirect('/owner/dashboard')
}

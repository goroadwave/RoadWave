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
  const { data: link } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!link) redirect('/owner/setup')

  redirect('/owner/dashboard')
}

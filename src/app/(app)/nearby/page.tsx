import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Phase 2 (2026-05-21): retired. The Campers Here list, wave UI,
// visibility pills, and shared-interest filter now live inside the
// CamperConnectionsCard on the unified campground hub
// (/campground/<slug>). This route stays as a redirect target so
// the existing in-app nav tab and any deep links still work, but it
// owns no UI of its own.
//
// Routing:
//   * Active check-in → /campground/<slug>. The Camper Connections
//     card lives inside that hub. We don't append a hash anchor
//     because the hub's inline scroll-pin script lands every load at
//     the top by design (so a reload / bookmark / bfcache restore
//     can't strand the camper mid-page). The renamed "Camper
//     Connections" nav tab makes the intent clear; the camper sees
//     the whole hub and the card a short scroll down.
//   * No active check-in → /checkin (the no-context fallback). That
//     surface tells the camper to scan their campground's QR to
//     unlock everything.

export default async function NearbyPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: latest } = await supabase
    .from('check_ins')
    .select('campground_id, campgrounds(slug, is_active)')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      campground_id: string
      campgrounds: { slug: string; is_active: boolean } | null
    }>()

  if (latest?.campgrounds?.slug && latest.campgrounds.is_active) {
    redirect(`/campground/${latest.campgrounds.slug}`)
  }

  redirect('/checkin')
}

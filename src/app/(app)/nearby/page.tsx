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
//   * Active check-in → /campground/<slug>#camper-connections.
//     Phase F (2026-05-21): the inline scroll-pin script in
//     campground-guest-hub-body.tsx now special-cases the
//     #camper-connections anchor -- it's the only deliberate
//     deep-link the AppNav fires, so we let the browser do its
//     native anchor-jump to the section. The pin loop still
//     applies to every other hash (Quick Action #wifi etc.) so a
//     reload / bookmark of the bare hub URL still lands at top.
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
    // Phase F: deep-link to the Camper Connections section. The
    // hub's inline scroll script honors #camper-connections by
    // skipping the pin loop, so the browser anchor-jumps cleanly
    // to the card instead of fighting the scroll-to-top pin.
    redirect(
      `/campground/${latest.campgrounds.slug}#camper-connections`,
    )
  }

  redirect('/checkin')
}

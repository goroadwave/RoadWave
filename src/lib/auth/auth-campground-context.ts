import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type {
  GuestHubBulletin,
  GuestHubCritical,
  GuestHubMeetup,
} from '@/components/campgrounds/campground-guest-hub-body'

// Server-side helper used by /login and /signup to fetch the
// campground info needed for AuthCampgroundContextStrip when a
// camper arrives from a campground QR page.
//
// Three reads (parallel):
//   1. campgrounds row — the subset of fields the strip displays
//      (logo, address, arrival/departure times, etc.). Service-role
//      because the auth pages run pre-login; the camper's
//      RLS-restricted client can't read every column they need.
//   2. Active bulletins (cap 30) — feeds HappeningSection's initial
//      payload so the auth page paints the same "Happening at X"
//      surface as the hub. The component polls itself from there.
//   3. Most-recent active is_critical bulletin — same SSR-first
//      paint pattern the hub uses, so the red banner renders
//      without a hydration flash.
//
// Returns null when the campground row can't be resolved (slug
// invalid, campground deactivated, RLS denial). Callers fall back
// to the plain (non-context) auth page in that case.

export type AuthCampgroundContext = {
  campground: {
    id: string
    slug: string
    name: string
    city: string | null
    region: string | null
    address: string | null
    logo_url: string | null
    check_in_time: string | null
    check_out_time: string | null
    early_check_in_note: string | null
    late_check_out_note: string | null
    arrival_departure_note: string | null
  }
  bulletins: GuestHubBulletin[]
  meetups: GuestHubMeetup[]
  critical: GuestHubCritical | null
}

export async function loadAuthCampgroundContext(
  slug: string,
): Promise<AuthCampgroundContext | null> {
  const admin = createSupabaseAdminClient()

  const { data: campground } = await admin
    .from('campgrounds')
    .select(
      'id, slug, name, city, region, address, logo_url, is_active, check_in_time, check_out_time, early_check_in_note, late_check_out_note, arrival_departure_note',
    )
    .eq('slug', slug)
    .maybeSingle<{
      id: string
      slug: string
      name: string
      city: string | null
      region: string | null
      address: string | null
      logo_url: string | null
      is_active: boolean
      check_in_time: string | null
      check_out_time: string | null
      early_check_in_note: string | null
      late_check_out_note: string | null
      arrival_departure_note: string | null
    }>()
  if (!campground || !campground.is_active) return null

  const nowIso = new Date().toISOString()
  const [{ data: bulletins }, { data: meetups }, { data: criticalRows }] =
    await Promise.all([
      admin
        .from('bulletins')
        .select('id, message, category, expires_at, created_at')
        .eq('campground_id', campground.id)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(30)
        .returns<GuestHubBulletin[]>(),
      admin
        .from('meetups')
        .select('id, title, description, location, start_at, end_at')
        .eq('campground_id', campground.id)
        .gte('start_at', nowIso)
        .order('start_at', { ascending: true })
        .limit(30)
        .returns<GuestHubMeetup[]>(),
      admin
        .from('bulletins')
        .select('id, message, expires_at, created_at')
        .eq('campground_id', campground.id)
        .eq('is_critical', true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .returns<
          {
            id: string
            message: string
            expires_at: string | null
            created_at: string
          }[]
        >(),
    ])

  const critical =
    Array.isArray(criticalRows) && criticalRows.length > 0
      ? criticalRows[0]
      : null

  // Strip the is_active field on the way out — the type that flows
  // out doesn't expose it; the auth page only ever reads from this
  // helper if is_active was true above.
  const { is_active: _ia, ...cgPublic } = campground
  void _ia
  return {
    campground: cgPublic,
    bulletins: bulletins ?? [],
    meetups: meetups ?? [],
    critical,
  }
}

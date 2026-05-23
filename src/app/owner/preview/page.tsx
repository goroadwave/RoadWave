import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  CampgroundGuestHubBody,
  type GuestHubBulletin,
  type GuestHubMeetup,
} from '@/components/campgrounds/campground-guest-hub-body'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Owner-only "this is what your guests see" preview. Sits OUTSIDE
// the (authed) layout group so the owner header / bottom nav / Riley
// don't appear over the simulated guest view — auth is inlined here.
//
// As of 2026-05-20 this page mounts the same component the public
// guest hub at /campground/<slug> uses. The only difference is the
// sticky preview banner above the guest hub body. previewMode=true
// disables:
//   * /api/campground/event logging (TrackedLinkButton onClick)
//   * /api/campground/message form submissions (Pulse needs-attention
//     + Contact Office)
//   * pulse_great / pulse_good / pulse_needs_attention event logs
//   * book_again_click + review_click event logs
//   * office_contact_started event logs
//
// Outbound CTA links (Book Again, Google Review) still navigate so
// the owner can confirm the URL is correct. Everything else renders
// identically to the live guest page.
//
// Data source: same column list as the guest hub page reads via the
// service-role admin client; row identity comes from the owner's
// most-recent campground_admins link (matches loadOwnerCampground).

export const dynamic = 'force-dynamic'

type CampgroundRow = Parameters<typeof CampgroundGuestHubBody>[0]['campground']

export default async function OwnerPreviewPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')
  if (!user.email_confirmed_at) redirect('/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role === 'guest') redirect('/checkin')

  // Most-recent owner admin link — mirrors loadOwnerCampground so an
  // owner managing 2+ campgrounds sees the same row in both places.
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
  const link = links?.[0]
  if (!link) {
    return <NoCampground />
  }

  const admin = createSupabaseAdminClient()

  // Use the SAME service-role SELECT list the public guest hub uses,
  // so the preview is a true mirror. Drift between the two
  // SELECTs is the bug that previously made /owner/preview show a
  // stale social-dashboard mock.
  const { data: campground } = await admin
    .from('campgrounds')
    .select(
      'id, slug, name, city, region, address, logo_url, is_active, amenities, amenity_notes, website, phone, google_review_url, booking_url, booking_message, booking_promo_code, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, feature_facebook_enabled, facebook_review_url, facebook_button_label, show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, show_wifi, wifi_network_name, wifi_password, wifi_notes, show_rules, rules_text, show_emergency_info, emergency_contact_number, emergency_after_hours, emergency_shelter_notes, emergency_other_notes, show_local_recommendations, local_recommendations_text, check_in_time, check_out_time, early_check_in_note, late_check_out_note, arrival_departure_note',
    )
    .eq('id', link.campground_id)
    .maybeSingle<CampgroundRow & { is_active: boolean }>()

  if (!campground) {
    return <NoCampground />
  }

  // Resolve the campground's canonical QR token so the Meet Other
  // Campers CTA inside the body builds the right /signup?next= URL
  // (same logic the public hub uses when no ?token= is on the URL).
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('token')
    .eq('campground_id', campground.id)
    .maybeSingle<{ token: string }>()
  const resolvedToken = tokenRow?.token ?? null

  // Bulletins + meetups + active critical via the admin client. Same
  // query shape as the guest hub page; previewMode controls what
  // side effects fire inside the body, not what data we fetch.
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
        .select('id, title, description, location, start_at, end_at, created_at')
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

  return (
    <>
      <PreviewBanner />
      <CampgroundGuestHubBody
        campground={campground}
        bulletins={bulletins ?? []}
        meetups={meetups ?? []}
        critical={critical}
        resolvedToken={resolvedToken}
        previewMode
      />
    </>
  )
}

function PreviewBanner() {
  return (
    <div
      className="sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between gap-3 shadow-md"
      style={{ background: '#7c3aed', color: '#ffffff' }}
    >
      <p className="text-xs sm:text-sm font-semibold tracking-wide">
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 mr-2">
          Preview mode
        </span>
        This is what your guests see
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/owner/dashboard"
          className="rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap"
          style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
        >
          Exit Preview ✕
        </Link>
        {/* Sign-out reachable from the preview page (which sits
            outside the owner (authed) chrome) so the owner can't be
            trapped here without a way to log out. */}
        <form action="/auth/sign-out?next=/owner/login" method="post">
          <button
            type="submit"
            className="rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap"
            style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

function NoCampground() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-night text-cream">
      <p className="text-sm text-mist mb-3">
        No campground linked yet — finish setup first.
      </p>
      <a
        href="/owner/profile"
        className="text-sm font-semibold text-flame underline-offset-2 hover:underline"
      >
        Go to profile setup →
      </a>
    </div>
  )
}

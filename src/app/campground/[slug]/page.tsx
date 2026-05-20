import { notFound, redirect } from 'next/navigation'
import {
  CampgroundGuestHubBody,
  type GuestHubBulletin,
  type GuestHubCampground,
  type GuestHubMeetup,
} from '@/components/campgrounds/campground-guest-hub-body'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Public unified guest hub. Reached when a camper scans a campground
// QR — the QR encodes /campground/<slug>?token=<uuid>. No login is
// required for anything on this page.
//
// Phase D of the guest-hub pivot (2026-05-20) merged this page with
// /campground/<slug>/updates so guests get the practical hub content
// (Park Map, Wi-Fi, Emergency Info, Rules, Local Recs, announcements,
// meetups, amenities, helpful links, engagement hub) directly on the
// QR landing URL. The old /updates path now 307-redirects here, so
// printed QRs and old links keep working.
//
// As of 2026-05-20 the full page JSX lives in
// src/components/campgrounds/campground-guest-hub-body.tsx so the
// owner /owner/preview route can mount the same component with a
// preview banner. This file keeps the page-level concerns: auth
// branching, token resolution, event logging, data fetching.
//
// Auth-state branching:
//   * Authed visitor WITH a valid token → redirect immediately to
//     /checkin?token=… so they land on the check-in confirmation
//     flow without seeing the hub they don't need.
//   * Anonymous visitor → render the unified hub. The "Meet Other
//     Campers — Optional" card near the bottom is the only surface
//     that triggers signup/login.
//
// The pending_checkin_token cookie is set by middleware when the URL
// matches /campground/<slug>?token=<uuid>; the (app) layout reads it
// post-auth and redirects to /checkin?token=… so a camper arrives at
// the right destination without needing to re-scan or re-paste the
// link.
//
// Service-role lookups for campground_qr_tokens (RLS service-only),
// for bulletin/meetup reads (RLS limits public reads otherwise), and
// for the event-log inserts (campground_events is service-role-only).

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Params = { slug: string }

type CampgroundRow = GuestHubCampground & {
  is_active: boolean
}

type TokenRow = {
  token: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('campgrounds')
    .select('name, city, region')
    .eq('slug', slug)
    .maybeSingle<{ name: string; city: string | null; region: string | null }>()
  if (!data) {
    return {
      title: 'Campground not on RoadWave yet',
      robots: { index: false, follow: false },
    }
  }
  const where = [data.city, data.region].filter(Boolean).join(', ')
  return {
    title: `${data.name} on RoadWave`,
    description: `${data.name}${where ? ` · ${where}` : ''} — park info, updates, help, and optional camper connection.`,
  }
}

export default async function CampgroundGuestHubPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token: scannedTokenRaw } = await searchParams
  const scannedToken =
    typeof scannedTokenRaw === 'string' && UUID_RE.test(scannedTokenRaw)
      ? scannedTokenRaw
      : null

  const admin = createSupabaseAdminClient()

  const { data: campground } = await admin
    .from('campgrounds')
    .select(
      'id, slug, name, city, region, logo_url, is_active, amenities, amenity_notes, website, phone, google_review_url, booking_url, booking_message, booking_promo_code, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, feature_facebook_enabled, facebook_review_url, facebook_button_label, show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, show_wifi, wifi_network_name, wifi_password, wifi_notes, show_rules, rules_text, show_emergency_info, emergency_contact_number, emergency_after_hours, emergency_shelter_notes, emergency_other_notes, show_local_recommendations, local_recommendations_text',
    )
    .eq('slug', slug)
    .maybeSingle<CampgroundRow>()

  if (!campground || !campground.is_active) notFound()

  // Token resolution. Prefer the ?token= query param (proves the
  // visitor came through a real QR scan) over the campground's stored
  // canonical token. The downstream "Meet Other Campers" CTA uses
  // the resolved token to build a /signup-next or /quickcheckin URL
  // that wires the camper to the right destination.
  let resolvedToken: string | null = scannedToken
  if (!resolvedToken) {
    const { data: tokenRow } = await admin
      .from('campground_qr_tokens')
      .select('token')
      .eq('campground_id', campground.id)
      .maybeSingle<TokenRow>()
    resolvedToken = tokenRow?.token ?? null
  }

  // Authed visitor with a real token: skip the hub and go straight
  // to the camper check-in flow. The (app) layout will run its own
  // auth + consent gates from there.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user && scannedToken) {
    redirect(`/checkin?token=${scannedToken}`)
  }

  // Event logging — fire-and-forget so renders never block on stats
  // writes. Three event types fire on different conditions:
  //   * qr_scan: only when ?token= is in the URL, i.e. the visitor
  //     came in via a printed QR sticker (not a direct link or a
  //     bookmark).
  //   * bulletin_view: legacy bulletin-engagement counter, kept for
  //     the existing owner dashboard metric.
  //   * updates_only_view: per-visit guest-hub counter introduced in
  //     migration 0044.
  // We insert all events in one round-trip when applicable so the
  // page render doesn't pay multiple network costs.
  const events: { campground_id: string; event_type: string; metadata: Record<string, unknown> }[] = [
    {
      campground_id: campground.id,
      event_type: 'bulletin_view',
      metadata: { source: 'guest_hub' },
    },
    {
      campground_id: campground.id,
      event_type: 'updates_only_view',
      metadata: { source: 'guest_hub' },
    },
  ]
  if (scannedToken) {
    events.push({
      campground_id: campground.id,
      event_type: 'qr_scan',
      metadata: { source: 'guest_hub' },
    })
  }
  void admin
    .from('campground_events')
    .insert(events)
    .then(({ error }) => {
      if (error) {
        console.error('[campground/guest-hub] event log failed:', error.message)
      }
    })

  // Bulletins (active = no expiry or future expiry) and upcoming
  // meetups (start_at >= now). Both capped at 30 so a campground
  // with a long history doesn't bloat the page.
  const nowIso = new Date().toISOString()
  const [{ data: bulletins }, { data: meetups }] = await Promise.all([
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
  ])

  return (
    <CampgroundGuestHubBody
      campground={campground}
      bulletins={bulletins ?? []}
      meetups={meetups ?? []}
      resolvedToken={resolvedToken}
    />
  )
}

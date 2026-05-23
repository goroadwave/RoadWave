import { notFound } from 'next/navigation'
import {
  CampgroundGuestHubBody,
  type GuestHubAuthedViewer,
  type GuestHubBulletin,
  type GuestHubCampground,
  type GuestHubMeetup,
} from '@/components/campgrounds/campground-guest-hub-body'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { NearbyCamper, PrivacyMode } from '@/lib/types/db'
import type { WaveState } from '@/components/waves/wave-button'
import {
  computeWaveEligibilityBatch,
  type WaveEligibilityReason,
} from '@/lib/wave/eligibility'

// Unified guest hub. Anonymous viewers see the campground info
// surfaces (Park Map, Wi-Fi, Emergency Info, Rules, Local Recs,
// announcements, meetups, amenities, helpful links, engagement hub)
// plus the "Meet Other Campers — Optional" CTA. Signed-in campers
// see the same hub with the Camper Connections layer (visibility
// pills, nearby list, wave UI, edit-interests) rendered in place of
// the CTA card.
//
// Phase D of the guest-hub pivot (2026-05-20) merged this page with
// /campground/<slug>/updates so guests get all the practical content
// directly on the QR landing URL. The old /updates path now
// 307-redirects here.
//
// Phase E (2026-05-21) made this page the post-auth landing for
// signed-in campers too. Earlier the page redirected authed users
// with a token to /checkin so they could do a "confirm your check-in"
// step. That separate screen is gone: signing in from a campground
// QR is already an opt-in to that campground's context, so we
// auto-establish presence here (best-effort `checkin_by_token` RPC
// call) and render the Camper Connections layer in place. The
// camper can drop out via the visibility pills on the same surface.
//
// The page-level JSX lives in
// src/components/campgrounds/campground-guest-hub-body.tsx so the
// owner /owner/preview route can mount the same component with a
// preview banner. This file keeps the page-level concerns:
// token resolution, event logging, presence upsert, viewer-data
// fetching for the Camper Connections layer.
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
      'id, slug, name, city, region, address, logo_url, is_active, amenities, amenity_notes, website, phone, google_review_url, booking_url, booking_message, booking_promo_code, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled, feature_facebook_enabled, facebook_review_url, facebook_button_label, show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, show_wifi, wifi_network_name, wifi_password, wifi_notes, show_rules, rules_text, show_emergency_info, emergency_contact_number, emergency_after_hours, emergency_shelter_notes, emergency_other_notes, show_local_recommendations, local_recommendations_text, check_in_time, check_out_time, early_check_in_note, late_check_out_note, arrival_departure_note',
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

  // Authed-viewer branch. Replaces the pre-Phase-E redirect to
  // /checkin?token=... with an in-place upgrade: the signed-in
  // camper sees the same hub as the anon visitor, plus the Camper
  // Connections layer. Presence (check_ins row) is established
  // best-effort via the resolved token below; failures don't block
  // the page render.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  //
  // Phase 3c -- also fetch the most recent active is_critical
  // bulletin so the camper page can SSR the red banner above the
  // welcome header on first paint, no flicker. Backed by the
  // bulletins_critical_idx partial index from mig 0058.
  const nowIso = new Date().toISOString()
  const [{ data: bulletins }, { data: meetups }, { data: criticalRows }, auth] =
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
      // Authed-viewer fetch. Returns null when the visitor is anon
      // OR when they are signed in but their email is not yet
      // verified (preserves the existing email-verification gate
      // without throwing on the Camper Connections layer). All
      // sub-queries are batched inside this helper so the auth
      // branch adds at most one extra Promise.all wave.
      resolveAuthedViewer(supabase, user, campground.id, resolvedToken),
    ])

  const critical =
    Array.isArray(criticalRows) && criticalRows.length > 0
      ? criticalRows[0]
      : null

  return (
    <CampgroundGuestHubBody
      campground={campground}
      bulletins={bulletins ?? []}
      meetups={meetups ?? []}
      critical={critical}
      resolvedToken={resolvedToken}
      auth={auth}
    />
  )
}

// Resolve the authed-viewer payload that drives the Camper
// Connections card. Returns null when the visitor is anonymous OR
// is signed in but their email is not yet verified (the
// checkin_by_token RPC raises P0002 in that case; we swallow it and
// fall back to the anon render so the hub still works for them).
//
// Steps:
//   1. Best-effort upsert presence via checkin_by_token. The RPC
//      renews an existing active row or inserts a new one with a
//      24-hour expiry (mig 0002). No-op when resolvedToken is null
//      (campground has no QR token configured).
//   2. Read the viewer's profile (privacy_mode, saved interest
//      filter) + their profile_interests rows in parallel with the
//      nearby_campers RPC and the waves/crossed_paths shape for
//      wave-state computation.
//   3. Build the WaveState map the existing NearbyList component
//      expects. crossed_paths.status takes precedence over
//      waves.status when both exist (a matched connection should
//      always render as "matched"/"connected" even if the
//      originating wave row is still flagged "pending").
async function resolveAuthedViewer(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: { id: string } | null,
  campgroundId: string,
  resolvedToken: string | null,
): Promise<GuestHubAuthedViewer | null> {
  if (!user) return null

  if (resolvedToken) {
    // Best-effort presence upsert. checkin_by_token is idempotent
    // (renews an existing active row instead of duplicating); if
    // it fails (P0001 invalid token, P0002 email not verified,
    // RLS denial) we still render the hub and the email-verify
    // gate below decides whether to surface the Connections layer
    // or fall back to the anon render. Supabase RPC errors come
    // back on the result object rather than throwing, so we
    // inspect `error` directly; the outer try/catch is just for
    // unexpected transport failures.
    try {
      const { error: presenceError } = await supabase.rpc(
        'checkin_by_token',
        { _token: resolvedToken },
      )
      if (presenceError && presenceError.code !== 'P0002') {
        console.warn(
          '[campground/hub] presence upsert failed:',
          presenceError.message,
        )
      }
    } catch (err) {
      console.warn(
        '[campground/hub] presence upsert threw:',
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  // Private RoadWave Stops -- the camper's own history of which
  // campgrounds they've joined. Idempotent, has its own 12h
  // dedupe so a reload doesn't inflate visit_count, and runs
  // even when resolvedToken is null (a camper who navigates
  // straight to /campground/<slug> from /home should still get
  // their history recorded). NOT a presence signal -- the row
  // never makes the camper appear in "Campers Here" anywhere;
  // see migration 0059 for the why.
  try {
    const { error: stopError } = await supabase.rpc(
      'record_roadwave_stop',
      { _campground_id: campgroundId },
    )
    if (stopError) {
      console.warn(
        '[campground/hub] RoadWave Stop upsert failed:',
        stopError.message,
      )
    }
  } catch (err) {
    console.warn(
      '[campground/hub] RoadWave Stop upsert threw:',
      err instanceof Error ? err.message : String(err),
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_mode, nearby_filter_interests, email_verified_at')
    .eq('id', user.id)
    .maybeSingle<{
      privacy_mode: PrivacyMode
      nearby_filter_interests: string[] | null
      email_verified_at: string | null
    }>()

  // Email-verify gate. The nearby_campers RPC + the wave actions
  // all require a verified profiles row; without one we degrade to
  // the anon render rather than surfacing a half-empty Connections
  // card the camper can't actually use.
  if (!profile || !profile.email_verified_at) return null

  const [
    { data: viewerInterestRows },
    { data: campers },
    { data: myWaves },
    { data: incomingWaves },
    { data: matches },
    { data: activeCheckInRow },
  ] = await Promise.all([
    supabase
      .from('profile_interests')
      .select('interests(slug)')
      .eq('profile_id', user.id),
    supabase.rpc('nearby_campers', { _campground_id: campgroundId }),
    supabase
      .from('waves')
      .select('to_profile_id, status')
      .eq('from_profile_id', user.id),
    // Phase Camper-Connections-v2: also fetch waves where the viewer is
    // the recipient. Used to flip the camper card to the "Wave back 👋"
    // state when somebody waved at them first -- previously this was
    // only surfaced via the Lantern + /waves/incoming/[id] detail page.
    supabase
      .from('waves')
      .select('from_profile_id, status')
      .eq('to_profile_id', user.id),
    supabase
      .from('crossed_paths')
      .select('id, profile_a_id, profile_b_id, status'),
    // hasActiveCheckIn drives the AppNav's "Updates Only" 8th-slot
    // action button. Even when checkin_by_token above didn't pop a
    // new row (failed token, RLS edge case), the camper may still
    // have an active check-in at a different campground -- a
    // separate select gives us the truth without re-using the
    // RPC's return value. Limit 1 because we only need yes/no.
    supabase
      .from('check_ins')
      .select('id')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle<{ id: string }>(),
  ])

  const viewerInterests = (viewerInterestRows ?? [])
    .map((row) => {
      const i = row.interests as unknown as { slug: string } | null
      return i?.slug ?? null
    })
    .filter((s): s is string => typeof s === 'string')

  // Wave-state precedence (most → least specific):
  //   1. crossed_paths.status (connected / pending_consent / declined)
  //   2. outgoing waves row (waved → "waved", matched, etc.)
  //   3. incoming waves row with status='pending' → "wave_back"
  // Connected/matched ALWAYS win over a bare outgoing-only wave
  // because they reflect the latest mutual state.
  const waveStateByProfileId: Record<string, WaveState> = {}
  const crossedPathByProfileId: Record<string, string> = {}

  for (const w of incomingWaves ?? []) {
    const s = (w.status as string | null) ?? 'pending'
    // Only mark wave_back for currently-pending incoming waves. If the
    // status is matched/connected/declined the crossed_paths loop
    // below will overwrite this entry with the right state.
    if (s === 'pending') waveStateByProfileId[w.from_profile_id] = 'wave_back'
  }
  for (const w of myWaves ?? []) {
    const s = (w.status as string | null) ?? 'pending'
    if (s === 'declined') waveStateByProfileId[w.to_profile_id] = 'declined'
    else if (s === 'connected')
      waveStateByProfileId[w.to_profile_id] = 'connected'
    else if (s === 'matched') waveStateByProfileId[w.to_profile_id] = 'matched'
    else waveStateByProfileId[w.to_profile_id] = 'waved'
  }
  for (const m of matches ?? []) {
    const otherId =
      m.profile_a_id === user.id ? m.profile_b_id : m.profile_a_id
    const s = (m.status as string | null) ?? 'pending_consent'
    if (s === 'connected') waveStateByProfileId[otherId] = 'connected'
    else if (s === 'declined') waveStateByProfileId[otherId] = 'declined'
    else waveStateByProfileId[otherId] = 'matched'
    // Save the crossed_paths.id so the WaveButton can render
    // "Say Hi →" / "Open chat →" deep-links without an extra fetch.
    if (m.id) crossedPathByProfileId[otherId] = m.id
  }

  // Camper Connections v3: enrich the redacted nearby_campers RPC
  // rows with display_name + username via the admin client (the
  // profiles_select_* policies don't allow a non-matched SELECT). A
  // camper has already opted into discovery by setting
  // privacy_mode='visible', so showing their display_name on the
  // card is consistent with the same-RLS scope the RPC already
  // operates under -- and gives the card a real identity instead of
  // the generic "A nearby camper" placeholder.
  const rawCampers = (campers ?? []) as Array<
    NearbyCamper & {
      display_name?: string | null
      username?: string | null
    }
  >
  const otherIds = rawCampers
    .map((c) => c.profile_id)
    .filter((id): id is string => !!id && id !== user.id)

  const admin = createSupabaseAdminClient()
  const { data: identityRows } =
    otherIds.length > 0
      ? await admin
          .from('profiles')
          .select('id, display_name, username')
          .in('id', otherIds)
      : { data: [] as { id: string; display_name: string | null; username: string | null }[] }
  const identityById = new Map(
    (identityRows ?? []).map((r) => [r.id, r] as const),
  )

  // Per-camper eligibility. The hub page now hides cards (or
  // renders disabled states) for campers the wave RLS would reject,
  // so no camper ever sees an active Send a Wave button that fails
  // on click. The batched compute uses the same admin-client lookups
  // we just did so we don't pay an extra round-trip per card.
  const eligibilityByProfileId = await computeWaveEligibilityBatch(
    user.id,
    otherIds,
    campgroundId,
  )
  const waveEligibilityByProfileId: Record<string, WaveEligibilityReason> = {}
  for (const [id, elig] of eligibilityByProfileId.entries()) {
    waveEligibilityByProfileId[id] = elig.reason
  }

  // SAFETY GATE: also strip the viewer's own profile if it somehow
  // appears in the nearby_campers result (the RPC excludes it, but
  // defense-in-depth in case of a future regression). A camper must
  // never see their own card and must never be able to wave at
  // themselves through this UI.
  const enrichedCampers: NearbyCamper[] = rawCampers
    .filter((c) => c.profile_id !== user.id)
    .map((c) => {
      const ident = identityById.get(c.profile_id)
      return {
        profile_id: c.profile_id,
        rig_type: c.rig_type ?? null,
        interests: c.interests ?? null,
        display_name: ident?.display_name ?? null,
        username: ident?.username ?? null,
      }
    })

  return {
    userId: user.id,
    campers: enrichedCampers,
    waveStateByProfileId,
    crossedPathByProfileId,
    waveEligibilityByProfileId,
    viewerInterests,
    initialInterests: profile.nearby_filter_interests ?? [],
    privacyMode: profile.privacy_mode,
    hasActiveCheckIn: !!activeCheckInRow,
  }
}

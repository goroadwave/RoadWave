import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CamperConnectionsCard } from '@/components/campgrounds/camper-connections-card'
import { PageHeading } from '@/components/ui/page-heading'
import { SafetyBanner } from '@/components/ui/safety-banner'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { NearbyCamper, PrivacyMode } from '@/lib/types/db'
import type { WaveState } from '@/components/waves/wave-button'
import {
  computeWaveEligibilityBatch,
  type WaveEligibilityReason,
} from '@/lib/wave/eligibility'

// Dedicated Camper Connections surface (Camper Connections v6,
// 2026-05-22). Before this refactor, tapping "Camper Connections"
// in the AppNav redirected to /campground/<slug>#camper-connections
// -- the QR hub anchor-jumped to a section deep below the
// campground utility (Wi-Fi, map, rules, reviews...). On a long
// mixed page this read as "the app dumped me halfway through a
// scroll for no reason." This page lands at the top, focused
// exclusively on the camper-to-camper social layer:
//
//   * Page heading "Campers Here" + the campground name
//   * Visibility pills (Visible / Quiet / Invisible)
//   * Edit interests + Privacy settings buttons
//   * Interest filter chips
//   * Nearby-camper card list with wave / matched state
//
// The campground utility (Wi-Fi, map, amenities, office help,
// updates, meetups, etc.) is preserved on /campground/<slug> for
// signed-in campers exactly as anon visitors see it -- the QR page
// stays the campground helper, this page is the social layer.
//
// No-context fallback: if the camper has no active check-in we
// redirect to /checkin, which renders the "you're not at a
// campground right now" surface. This matches the original /nearby
// behavior and keeps the cookie-bridge / OAuth-recovery code paths
// pointing at the same endpoint.
//
// The query block mirrors what /campground/[slug]/page.tsx's
// resolveAuthedViewer does -- intentionally duplicated rather than
// extracted because the resulting helper would only have two
// callers and would make the surface harder to grep. If a third
// surface ever wants the same data, lift it then.

export const dynamic = 'force-dynamic'

export default async function NearbyPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/nearby')

  // Resolve the camper's most-recent active check-in. With no
  // active check-in, fall through to /checkin (the no-context
  // fallback that explains how to scan a campground QR).
  const { data: latest } = await supabase
    .from('check_ins')
    .select('campground_id, campgrounds(id, slug, name, is_active)')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      campground_id: string
      campgrounds: {
        id: string
        slug: string
        name: string
        is_active: boolean
      } | null
    }>()

  if (!latest?.campgrounds?.slug || !latest.campgrounds.is_active) {
    redirect('/checkin')
  }

  const campground = latest.campgrounds
  const campgroundId = campground.id

  // Profile + interest catalog + nearby campers + wave state. The
  // shape is the same as /campground/[slug]'s resolveAuthedViewer
  // because both surfaces render the same CamperConnectionsCard
  // component -- but here the page IS the card, with a clean page
  // heading on top instead of the long campground utility above.
  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_mode, nearby_filter_interests, email_verified_at')
    .eq('id', user.id)
    .maybeSingle<{
      privacy_mode: PrivacyMode
      nearby_filter_interests: string[] | null
      email_verified_at: string | null
    }>()

  // Email-verify gate. Without a verified profile the
  // nearby_campers RPC + wave actions all reject; degrade gracefully
  // and route the camper through the verification surface instead
  // of rendering a half-empty list.
  if (!profile || !profile.email_verified_at) {
    redirect('/verify')
  }

  const [
    { data: viewerInterestRows },
    { data: campers },
    { data: myWaves },
    { data: incomingWaves },
    { data: matches },
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
    supabase
      .from('waves')
      .select('from_profile_id, status')
      .eq('to_profile_id', user.id),
    supabase
      .from('crossed_paths')
      .select('id, profile_a_id, profile_b_id, status'),
  ])

  const viewerInterests = (viewerInterestRows ?? [])
    .map((row) => {
      const i = row.interests as unknown as { slug: string } | null
      return i?.slug ?? null
    })
    .filter((s): s is string => typeof s === 'string')

  const waveStateByProfileId: Record<string, WaveState> = {}
  const crossedPathByProfileId: Record<string, string> = {}

  for (const w of incomingWaves ?? []) {
    const s = (w.status as string | null) ?? 'pending'
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
    if (m.id) crossedPathByProfileId[otherId] = m.id
  }

  // Enrich the redacted RPC payload with display_name + username
  // via the admin client (profiles RLS hides non-matched rows from
  // the user client). Same pattern as the hub-page enrichment.
  const rawCampers = (campers ?? []) as Array<
    NearbyCamper & { display_name?: string | null; username?: string | null }
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
      : {
          data: [] as {
            id: string
            display_name: string | null
            username: string | null
          }[],
        }
  const identityById = new Map(
    (identityRows ?? []).map((r) => [r.id, r] as const),
  )

  const eligibilityByProfileId = await computeWaveEligibilityBatch(
    user.id,
    otherIds,
    campgroundId,
  )
  const waveEligibilityByProfileId: Record<string, WaveEligibilityReason> = {}
  for (const [id, elig] of eligibilityByProfileId.entries()) {
    waveEligibilityByProfileId[id] = elig.reason
  }

  // Defense-in-depth: filter out the viewer's own profile_id, even
  // though the RPC already excludes it. A self-card has been an
  // intermittent source of bugs whenever the RPC's auth.uid()
  // resolution surprised us.
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

  const updatesOnlyMode = profile.privacy_mode === 'campground_updates_only'
  const currentVisibility = (updatesOnlyMode
    ? 'invisible'
    : profile.privacy_mode === 'visible' ||
        profile.privacy_mode === 'quiet' ||
        profile.privacy_mode === 'invisible'
      ? profile.privacy_mode
      : 'visible') as 'visible' | 'quiet' | 'invisible'

  return (
    <div className="space-y-5">
      <SafetyBanner message="A wave is only an introduction. Do not share your exact site number unless you choose to. Meet in public areas first." />

      <PageHeading
        eyebrow="Campers here"
        title={`Camper Connections at ${campground.name}`}
        subtitle="See campers here who share your interests. Wave if you want to connect. Nothing opens unless it's mutual."
      />

      <CamperConnectionsCard
        campgroundId={campgroundId}
        campgroundSlug={campground.slug}
        campers={enrichedCampers}
        waveStateByProfileId={waveStateByProfileId}
        crossedPathByProfileId={crossedPathByProfileId}
        waveEligibilityByProfileId={waveEligibilityByProfileId}
        viewerInterests={viewerInterests}
        initialInterests={profile.nearby_filter_interests ?? []}
        currentVisibility={currentVisibility}
        updatesOnlyMode={updatesOnlyMode}
      />

      <p className="text-center text-xs text-mist/80">
        <Link
          href={`/campground/${campground.slug}`}
          className="text-flame underline-offset-2 hover:underline"
        >
          ← Back to campground info
        </Link>
      </p>
    </div>
  )
}

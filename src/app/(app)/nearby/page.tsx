import Link from 'next/link'
import { NearbyList } from '@/components/nearby/nearby-list'
import { PageHeading } from '@/components/ui/page-heading'
import { SafetyBanner } from '@/components/ui/safety-banner'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { NearbyCamper } from '@/lib/types/db'
import type { WaveState } from '@/components/waves/wave-button'

export default async function NearbyPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nearby_filter_interests, privacy_mode')
    .eq('id', user!.id)
    .single()
  const initialInterests = profile?.nearby_filter_interests ?? []
  const inUpdatesOnlyMode =
    profile?.privacy_mode === 'campground_updates_only'

  const { data: viewerInterestRows } = await supabase
    .from('profile_interests')
    .select('interests(slug)')
    .eq('profile_id', user!.id)
  const viewerInterests = (viewerInterestRows ?? [])
    .map((row) => {
      const i = row.interests as unknown as { slug: string } | null
      return i?.slug ?? null
    })
    .filter((s): s is string => typeof s === 'string')

  const { data: latestCheckIn } = await supabase
    .from('check_ins')
    .select('id, campground_id, expires_at')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestCheckIn) {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Nobody's home"
          title="You're not checked in"
          subtitle="Scan a QR and the locals will show up here."
        />
        <Link
          href="/checkin"
          className="inline-flex items-center gap-2 rounded-lg bg-flame px-4 py-2 text-sm font-semibold text-night shadow-lg shadow-flame/10 hover:bg-amber-400"
        >
          Check in
          <span aria-hidden>👋</span>
        </Link>
        {initialInterests.length > 0 && (
          <p className="text-xs text-mist">
            Your saved filter preferences are ready — they&apos;ll apply the
            moment you check in.
          </p>
        )}
      </div>
    )
  }

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, name, city, region')
    .eq('id', latestCheckIn.campground_id)
    .single()

  // Campground Updates Only mode: skip the camper list entirely and
  // show a soft message pointing the user back to settings.
  if (inUpdatesOnlyMode) {
    return (
      <div className="space-y-5">
        <SafetyBanner message="Safety reminder: Meet in public campground areas, trust your instincts, and do not share your exact site number unless you choose to." />
        <PageHeading
          eyebrow={`Currently at ${campground?.name ?? 'your campground'}`}
          title="Campers Checked In Here"
          subtitle="Wave when the vibe feels right."
        />
        <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-5 space-y-2">
          <p className="text-sm text-cream leading-relaxed">
            You are in Campground Updates Only mode. Switch to Visible
            or Quiet to see campers checked in here.
          </p>
          <Link
            href="/settings/privacy"
            className="inline-flex text-xs font-semibold text-flame underline-offset-2 hover:underline"
          >
            Open privacy settings →
          </Link>
        </div>
      </div>
    )
  }

  const { data: campers, error } = await supabase.rpc('nearby_campers', {
    _campground_id: latestCheckIn.campground_id,
  })

  const [{ data: myWaves }, { data: matches }] = await Promise.all([
    supabase
      .from('waves')
      .select('to_profile_id, status')
      .eq('from_profile_id', user!.id),
    supabase
      .from('crossed_paths')
      .select('profile_a_id, profile_b_id, status'),
  ])

  const waveStateByProfileId: Record<string, WaveState> = {}
  for (const w of myWaves ?? []) {
    const s = (w.status as string | null) ?? 'pending'
    if (s === 'declined') waveStateByProfileId[w.to_profile_id] = 'declined'
    else if (s === 'connected') waveStateByProfileId[w.to_profile_id] = 'connected'
    else if (s === 'matched') waveStateByProfileId[w.to_profile_id] = 'matched'
    else waveStateByProfileId[w.to_profile_id] = 'waved'
  }
  for (const m of matches ?? []) {
    const otherId = m.profile_a_id === user!.id ? m.profile_b_id : m.profile_a_id
    const s = (m.status as string | null) ?? 'pending_consent'
    if (s === 'connected') waveStateByProfileId[otherId] = 'connected'
    else if (s === 'declined') waveStateByProfileId[otherId] = 'declined'
    else waveStateByProfileId[otherId] = 'matched'
  }

  return (
    <div className="space-y-5">
      <SafetyBanner message="Safety reminder: Meet in public campground areas, trust your instincts, and do not share your exact site number unless you choose to." />
      <PageHeading
        eyebrow={`Currently at ${campground?.name ?? 'your campground'}`}
        title="Campers Checked In Here"
        subtitle="Wave when the vibe feels right."
      />

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          Couldn&apos;t load nearby campers: {error.message}
        </p>
      ) : (
        <NearbyList
          campers={(campers ?? []) as NearbyCamper[]}
          campgroundId={latestCheckIn.campground_id}
          waveStateByProfileId={waveStateByProfileId}
          viewerInterests={viewerInterests}
          initialInterests={initialInterests}
        />
      )}
    </div>
  )
}

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

  // Filter prefs are stored on the profile so they survive even when the
  // user isn't currently checked in anywhere.
  const { data: profile } = await supabase
    .from('profiles')
    .select('nearby_filter_styles, nearby_filter_interests')
    .eq('id', user!.id)
    .single()
  const initialStyles = profile?.nearby_filter_styles ?? []
  const initialInterests = profile?.nearby_filter_interests ?? []

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
        {(initialStyles.length > 0 || initialInterests.length > 0) && (
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

  const { data: campers, error } = await supabase.rpc('nearby_campers', {
    _campground_id: latestCheckIn.campground_id,
  })

  const [{ data: myWaves }, { data: matches }] = await Promise.all([
    supabase.from('waves').select('to_profile_id').eq('from_profile_id', user!.id),
    supabase.from('crossed_paths').select('profile_a_id, profile_b_id'),
  ])

  const waveStateByProfileId: Record<string, WaveState> = {}
  for (const w of myWaves ?? []) {
    waveStateByProfileId[w.to_profile_id] = 'waved'
  }
  for (const m of matches ?? []) {
    const otherId = m.profile_a_id === user!.id ? m.profile_b_id : m.profile_a_id
    waveStateByProfileId[otherId] = 'matched'
  }

  return (
    <div className="space-y-5">
      <SafetyBanner />
      <PageHeading
        eyebrow={`Currently at ${campground?.name ?? 'your campground'}`}
        title="Nearby campers"
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
          initialStyles={initialStyles}
          initialInterests={initialInterests}
        />
      )}
    </div>
  )
}

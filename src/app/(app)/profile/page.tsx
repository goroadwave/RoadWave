import Link from 'next/link'
import { RoadWaveStopsList } from '@/components/profile/roadwave-stops-list'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Camper account index. Currently surfaces the private RoadWave Stops
// history (campgrounds the camper has joined/scanned over time) plus
// links into the existing profile setup and privacy settings pages.
//
// Strict privacy contract: every row read from camper_roadwave_stops
// is RLS-scoped to the calling user via the policy in migration 0059.
// This page never exposes other campers' histories, never publicly
// lists where any camper has been, and never causes a camper to
// appear at any of these campgrounds (those rows are historical;
// active presence still lives in check_ins).

export const dynamic = 'force-dynamic'

type StopRow = {
  campground_id: string
  first_seen_at: string
  last_seen_at: string
  visit_count: number
  campgrounds: {
    slug: string
    name: string
    city: string | null
    region: string | null
    is_active: boolean
  } | null
}

export default async function ProfileIndexPage() {
  const supabase = await createSupabaseServerClient()

  // RLS keeps this to the current user's rows; no extra where-clause
  // needed beyond the order/limit. The join to campgrounds resolves
  // the human-friendly name + slug for each stop.
  const { data: stops, error } = await supabase
    .from('camper_roadwave_stops')
    .select(
      'campground_id, first_seen_at, last_seen_at, visit_count, campgrounds(slug, name, city, region, is_active)',
    )
    .order('last_seen_at', { ascending: false })
    .limit(100)
    .returns<StopRow[]>()

  const visibleStops = (stops ?? []).filter(
    (s) => s.campgrounds && s.campgrounds.is_active,
  )

  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow="Your account"
        title="Your RoadWave"
        subtitle="Profile, privacy, and the campgrounds you've stopped at."
      />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
            RoadWave Stops
          </h2>
          {visibleStops.length > 0 && (
            <span className="text-[11px] text-mist">
              {visibleStops.length} campground
              {visibleStops.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <p className="text-xs text-mist leading-snug">
          A private record of campgrounds you&apos;ve joined. Only you can see
          this list. It does not make you visible at campgrounds you&apos;re
          not currently checked in to.
        </p>
        {error ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            We couldn&apos;t load your RoadWave Stops just now.
          </p>
        ) : (
          <RoadWaveStopsList stops={visibleStops} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
          Profile &amp; settings
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/profile/setup"
            className="block rounded-2xl border border-flame/30 bg-flame/[0.05] p-4 hover:border-flame/60 hover:bg-flame/[0.10] transition-colors"
          >
            <p className="text-sm font-semibold text-cream">
              Edit profile &amp; interests
            </p>
            <p className="text-xs text-mist leading-snug pt-1">
              Username, avatar, rig type, interests, and what you share
              with other campers.
            </p>
          </Link>
          <Link
            href="/settings/privacy"
            className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-white/30 hover:bg-white/[0.06] transition-colors"
          >
            <p className="text-sm font-semibold text-cream">Privacy settings</p>
            <p className="text-xs text-mist leading-snug pt-1">
              Visibility mode, what other campers see, and the
              Campground Updates Only switch.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}

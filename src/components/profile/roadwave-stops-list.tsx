import Link from 'next/link'

// Renders the RoadWave Stops list on /profile. Read-only display
// surface for camper_roadwave_stops; no mutations or hover-state
// menus -- a stop is just a record that the camper was somewhere,
// not a thing the camper edits directly.

type Stop = {
  campground_id: string
  first_seen_at: string
  last_seen_at: string
  visit_count: number
  campgrounds: {
    slug: string
    name: string
    city: string | null
    region: string | null
  } | null
}

function formatStopDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function RoadWaveStopsList({ stops }: { stops: Stop[] }) {
  if (stops.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-5 text-sm text-mist leading-snug">
        No stops yet. The next time you scan a campground&apos;s RoadWave QR
        and sign in, it shows up here so you can find your way back.
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {stops.map((stop) => {
        const cg = stop.campgrounds
        if (!cg) return null
        const where = [cg.city, cg.region].filter(Boolean).join(', ')
        const visits = stop.visit_count
        const first = formatStopDate(stop.first_seen_at)
        const last = formatStopDate(stop.last_seen_at)
        const sameDate = first === last
        return (
          <li key={stop.campground_id}>
            <Link
              href={`/campground/${cg.slug}`}
              className="block rounded-2xl border border-white/10 bg-card p-4 hover:border-flame/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-cream truncate">
                    {cg.name}
                  </p>
                  {where && (
                    <p className="text-xs text-mist truncate">{where}</p>
                  )}
                  <p className="text-[11px] text-mist/80 leading-snug">
                    {sameDate
                      ? `Visited ${first}`
                      : `First visited ${first} · Last visited ${last}`}
                  </p>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-flame font-semibold">
                    {visits} visit{visits === 1 ? '' : 's'}
                  </p>
                  <p className="text-[10px] text-mist">Open hub ↗</p>
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

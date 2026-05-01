type Counts = {
  visible: number
  quiet: number
  invisible: number
  campground_only: number
}

// Per-mode breakdown of currently checked-in guests for the owner
// dashboard. campground_only guests count for owner activity stats
// (RSVPs, etc.) — invisible guests don't, by design.
export function VisibilityBreakdown({ counts }: { counts: Counts }) {
  const total =
    counts.visible + counts.quiet + counts.invisible + counts.campground_only
  const rows: { label: string; value: number; tone: string; sub: string }[] = [
    {
      label: 'Visible',
      value: counts.visible,
      tone: 'text-leaf',
      sub: 'In nearby + open to waves',
    },
    {
      label: 'Quiet',
      value: counts.quiet,
      tone: 'text-cream',
      sub: 'Hidden, can wave first',
    },
    {
      label: 'Invisible',
      value: counts.invisible,
      tone: 'text-mist',
      sub: 'Pure observers',
    },
    {
      label: 'Campground Only',
      value: counts.campground_only,
      tone: 'text-flame',
      sub: 'Sees bulletins/meetups, hidden from campers',
    },
  ]
  return (
    <section className="rounded-2xl border border-white/5 bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-mist">
          Visibility breakdown
        </p>
        <p className="text-[11px] text-mist">{total} checked in now</p>
      </div>
      <ul className="divide-y divide-white/5">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between py-2 gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cream">{r.label}</p>
              <p className="text-[11px] text-mist truncate">{r.sub}</p>
            </div>
            <p className={`font-display text-xl font-extrabold ${r.tone}`}>
              {r.value}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

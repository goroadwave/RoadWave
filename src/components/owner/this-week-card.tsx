import { Eyebrow } from '@/components/ui/eyebrow'

// Six-up stats grid summarising the past 7 days for the owner dashboard.
// Backed by the owner_weekly_stats() RPC (migration 0038). Pure
// presentation — the page fetches the data and passes the counts in.

export type WeeklyStats = {
  qrScans: number
  checkIns: number
  reviewClicks: number
  bookAgainClicks: number
  contactMessages: number
  bulletinViews: number
}

export function ThisWeekCard({ stats }: { stats: WeeklyStats }) {
  const cells: { label: string; value: number }[] = [
    { label: 'QR scans', value: stats.qrScans },
    { label: 'Check-ins', value: stats.checkIns },
    { label: 'Review clicks', value: stats.reviewClicks },
    { label: 'Book Again clicks', value: stats.bookAgainClicks },
    { label: 'Office messages', value: stats.contactMessages },
    { label: 'Bulletin views', value: stats.bulletinViews },
  ]

  return (
    <section className="space-y-3">
      <Eyebrow>This week · past 7 days</Eyebrow>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/5 bg-card p-3 sm:p-4"
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-mist leading-tight">
              {c.label}
            </p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-cream tabular-nums">
              {c.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

import { requireAdmin } from '@/lib/admin/guard'
import { AutoRefresher } from '@/components/admin/auto-refresher'
import { EmptyState } from '@/components/admin/empty-state'

type ActivityRow = {
  active_checkins: number
  waves_pending: number
  waves_matched: number
  waves_connected: number
  waves_declined: number
  new_connections_today: number
  bulletins_today: number
  active_visible: number
  active_quiet: number
  active_invisible: number
  active_campground_updates_only: number
}

export default async function ActivityPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .rpc('admin_activity_summary')
    .maybeSingle<ActivityRow>()

  const cards: { label: string; value: number; tone?: 'flame' | 'leaf' }[] = [
    { label: 'Active check-ins', value: data?.active_checkins ?? 0, tone: 'flame' },
    { label: 'Visible', value: data?.active_visible ?? 0, tone: 'leaf' },
    { label: 'Quiet', value: data?.active_quiet ?? 0 },
    { label: 'Invisible', value: data?.active_invisible ?? 0 },
    { label: 'Campground Updates Only', value: data?.active_campground_updates_only ?? 0, tone: 'flame' },
    { label: 'Waves · pending', value: data?.waves_pending ?? 0 },
    { label: 'Waves · matched', value: data?.waves_matched ?? 0 },
    { label: 'Waves · connected', value: data?.waves_connected ?? 0, tone: 'leaf' },
    { label: 'Waves · declined', value: data?.waves_declined ?? 0 },
    { label: 'New connections today', value: data?.new_connections_today ?? 0, tone: 'leaf' },
    { label: 'Bulletins today', value: data?.bulletins_today ?? 0 },
  ]

  return (
    <div className="space-y-5">
      <AutoRefresher everyMs={60_000} />
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          Live activity
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          What&apos;s happening right now
        </h1>
        <p className="text-xs text-mist">
          Refreshes every 60 seconds. Counts are campground-level —
          no site numbers, no precise locations.
        </p>
      </header>

      {data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-white/5 bg-card p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-mist">
                {c.label}
              </p>
              <p
                className={`mt-1 font-display text-3xl font-extrabold ${
                  c.tone === 'flame'
                    ? 'text-flame'
                    : c.tone === 'leaf'
                      ? 'text-leaf'
                      : 'text-cream'
                }`}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No live activity yet"
          body="Counts will appear here once campers start checking in and waving."
        />
      )}
    </div>
  )
}

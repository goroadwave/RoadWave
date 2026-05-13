import { requireAdmin } from '@/lib/admin/guard'
import { AutoRefresher } from '@/components/admin/auto-refresher'
import { EmptyState } from '@/components/admin/empty-state'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

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

type EventRow = {
  event_type: string
  occurred_at: string
  campground_id: string
}

type CampgroundLookup = {
  id: string
  name: string
  slug: string
}

const EVENT_LABEL: Record<string, string> = {
  qr_scan: 'QR scan',
  check_in_started: 'Check-in started',
  check_in_completed: 'Check-in completed',
  review_click: 'Review click',
  book_again_click: 'Book again click',
  contact_message: 'Office message',
  bulletin_view: 'Bulletin view',
  pulse_great: 'Pulse · great',
  pulse_good: 'Pulse · good',
  pulse_needs_attention: 'Pulse · needs attention',
}

function formatRelative(iso: string): string {
  const ageSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (ageSec < 60) return `${Math.floor(ageSec)}s ago`
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`
  return `${Math.floor(ageSec / 86400)}d ago`
}

export default async function ActivityPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .rpc('admin_activity_summary')
    .maybeSingle<ActivityRow>()

  // Recent events stream — campground_events is service-role-only so
  // we use the admin client. We only show the most recent 50; older
  // history is for /owner/analytics, not the cross-campground admin
  // overview.
  const admin = createSupabaseAdminClient()
  const { data: recentEvents } = await admin
    .from('campground_events')
    .select('event_type, occurred_at, campground_id')
    .order('occurred_at', { ascending: false })
    .limit(50)
    .returns<EventRow[]>()

  const cgIds = Array.from(
    new Set((recentEvents ?? []).map((e) => e.campground_id)),
  )
  const cgLookup: Record<string, CampgroundLookup> = {}
  if (cgIds.length > 0) {
    const { data: cgs } = await admin
      .from('campgrounds')
      .select('id, name, slug')
      .in('id', cgIds)
      .returns<CampgroundLookup[]>()
    for (const c of cgs ?? []) cgLookup[c.id] = c
  }

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

      <section className="space-y-2 pt-4">
        <header className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
            Recent events
          </p>
          <h2 className="font-display text-xl font-extrabold text-cream">
            Last 50 events across all campgrounds
          </h2>
          <p className="text-xs text-mist">
            Append-only stream of QR scans, check-ins, bulletin views, and
            engagement-hub taps. Campground-level only — no camper PII.
          </p>
        </header>
        {recentEvents && recentEvents.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-mist">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Campground</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-cream">
                {recentEvents.map((evt, i) => {
                  const cg = cgLookup[evt.campground_id]
                  return (
                    <tr key={`${evt.occurred_at}-${i}`}>
                      <td className="px-3 py-2 text-xs text-mist whitespace-nowrap">
                        {formatRelative(evt.occurred_at)}
                      </td>
                      <td className="px-3 py-2">
                        {EVENT_LABEL[evt.event_type] ?? evt.event_type}
                      </td>
                      <td className="px-3 py-2 text-mist">
                        {cg ? `${cg.name} (${cg.slug})` : evt.campground_id}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No recent events"
            body="Once campers scan a QR or tap an engagement button, events will appear here."
          />
        )}
      </section>
    </div>
  )
}

import { requireAdmin } from '@/lib/admin/guard'
import { EmptyState } from '@/components/admin/empty-state'
import { ReportRow } from '@/components/admin/report-row'

type ReportRowData = {
  id: string
  reporter_id: string
  reported_user_id: string | null
  category: string
  description: string | null
  status: 'open' | 'under_review' | 'actioned' | 'dismissed'
  created_at: string
}

type ProfileLite = { id: string; username: string; display_name: string | null; suspended_at: string | null }

function nameFor(p: ProfileLite | undefined, fallback: string): string {
  if (!p) return fallback
  return p.display_name ?? p.username ?? fallback
}

export default async function SafetyPage() {
  const { supabase } = await requireAdmin()

  const { data: rawReports } = await supabase
    .from('reports')
    .select(
      'id, reporter_id, reported_user_id, category, description, status, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100)

  const reports = (rawReports ?? []) as ReportRowData[]
  const profileIds = Array.from(
    new Set(
      reports.flatMap((r) =>
        [r.reporter_id, r.reported_user_id].filter(
          (x): x is string => typeof x === 'string',
        ),
      ),
    ),
  )

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, username, display_name, suspended_at')
          .in('id', profileIds)
      : { data: [] as ProfileLite[] }

  const byId = new Map<string, ProfileLite>()
  for (const p of (profiles ?? []) as ProfileLite[]) byId.set(p.id, p)

  const suspendedCount = ((profiles ?? []) as ProfileLite[]).filter(
    (p) => p.suspended_at !== null,
  ).length

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          Safety + reports
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          Reports queue
        </h1>
        <p className="text-xs text-mist">
          {reports.length} report{reports.length === 1 ? '' : 's'} ·{' '}
          {suspendedCount} suspended account
          {suspendedCount === 1 ? '' : 's'} in this view
        </p>
      </header>

      {reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          body="Reports submitted by users via the in-app Report button will land here."
        />
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <ReportRow
                row={{
                  id: r.id,
                  reporter_name: nameFor(byId.get(r.reporter_id), 'Reporter'),
                  reported_name: r.reported_user_id
                    ? nameFor(byId.get(r.reported_user_id), 'Reported user')
                    : '—',
                  category: r.category,
                  description: r.description,
                  status: r.status,
                  created_at: r.created_at,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { requireAdmin } from '@/lib/admin/guard'
import { EmptyState } from '@/components/admin/empty-state'
import { SignupsChart } from '@/components/admin/signups-chart'

type Overview = {
  signups_all_time: number
  active_today: number
  active_week: number
  consent_confirmed: number
}

type SignupDay = { day: string; count: number }
type ProviderRow = { provider: string; count: number }

export default async function UsersPage() {
  const { supabase } = await requireAdmin()
  const [{ data: overview }, { data: days }, { data: providers }] =
    await Promise.all([
      supabase.rpc('admin_user_overview').maybeSingle<Overview>(),
      supabase.rpc('admin_signups_30d'),
      supabase.rpc('admin_signup_provider_split'),
    ])

  const stats: { label: string; value: number; tone?: 'flame' | 'leaf' }[] = [
    { label: 'Total signups', value: overview?.signups_all_time ?? 0, tone: 'flame' },
    { label: 'Active today', value: overview?.active_today ?? 0, tone: 'leaf' },
    { label: 'Active this week', value: overview?.active_week ?? 0 },
    {
      label: 'Consent confirmed',
      value: overview?.consent_confirmed ?? 0,
    },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          User overview
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          Growth + consent
        </h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/5 bg-card p-4">
            <p className="text-[11px] uppercase tracking-wider text-mist">
              {s.label}
            </p>
            <p
              className={`mt-1 font-display text-3xl font-extrabold ${
                s.tone === 'flame'
                  ? 'text-flame'
                  : s.tone === 'leaf'
                    ? 'text-leaf'
                    : 'text-cream'
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {days && days.length > 0 ? (
        <SignupsChart data={days as SignupDay[]} />
      ) : (
        <EmptyState
          title="No signup history yet"
          body="The 30-day signup trend will populate as new accounts are created."
        />
      )}

      <section className="rounded-2xl border border-white/5 bg-card p-4">
        <p className="text-[10px] uppercase tracking-wider text-mist mb-2">
          Signup provider split
        </p>
        {providers && providers.length > 0 ? (
          <ul className="space-y-1">
            {(providers as ProviderRow[]).map((row) => (
              <li
                key={row.provider}
                className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0"
              >
                <span className="text-sm text-cream capitalize">
                  {row.provider}
                </span>
                <span className="text-sm font-semibold text-flame">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mist">No signups yet.</p>
        )}
      </section>
    </div>
  )
}

import { Eyebrow } from '@/components/ui/eyebrow'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadOwnerCampground } from '../_helpers'

export default async function OwnerAnalyticsPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <PageHeading
        eyebrow="Stats"
        title="No campground linked"
        subtitle="Refresh, or contact support if this persists."
      />
    )
  }

  const supabase = await createSupabaseServerClient()
  const cgId = campground.id

  // Aggregates via SECURITY DEFINER RPCs. Both filter to privacy_mode='visible'
  // + not suspended; the interest aggregate also requires share_interests=true.
  // The RPCs guard on campground_admins membership, so non-admins get zeros.
  const [countsRes, interestsRes] = await Promise.all([
    supabase.rpc('owner_checkin_counts', { _campground_id: cgId }).maybeSingle(),
    supabase.rpc('owner_interest_aggregate', { _campground_id: cgId }),
  ])
  const counts = countsRes.data as
    | { today: number; week: number; all_time: number }
    | null
  const today = counts?.today ?? 0
  const week = counts?.week ?? 0
  const allTime = counts?.all_time ?? 0
  const interests = (interestsRes.data ?? []) as Array<{
    slug: string
    label: string
    count: number
  }>

  const totalInterestPicks = interests.reduce((acc, r) => acc + r.count, 0)

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Stats"
        title="Anonymous check-in counts"
        subtitle="Opt-in only. No guest names, emails, or personal data — ever."
      />
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Today" value={today} />
        <Stat label="Past 7 days" value={week} />
        <Stat label="All time" value={allTime} />
      </section>

      <section className="space-y-2">
        <Eyebrow>Interest mix · checked in right now</Eyebrow>
        {interests.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-5 text-center text-sm text-mist">
            No interest data yet. This populates when guests with{' '}
            <span className="text-cream">share interests</span> turned on are
            actively checked in.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {interests.map((row) => (
              <InterestBar
                key={row.slug}
                label={row.label}
                count={row.count}
                total={totalInterestPicks}
              />
            ))}
          </ul>
        )}
        <p className="text-[11px] text-mist/70 leading-snug pt-1">
          Aggregate only — counts of guests who selected each interest and
          chose to share it. Quiet, Invisible, and suspended users are not
          counted.
        </p>
      </section>

      <section>
        <Eyebrow>What we track</Eyebrow>
        <p className="mt-2 text-sm text-mist leading-snug">
          Counts and aggregate interests for opt-in (Visible) check-ins. We
          do not surface — and could not surface — guest names, emails,
          phone numbers, exact campsite, profile fields, wave activity, or
          messages on this dashboard. RoadWave is guest-private by design.
        </p>
      </section>
    </div>
  )
}

function InterestBar({
  label,
  count,
  total,
}: {
  label: string
  count: number
  total: number
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <li className="rounded-xl border border-white/5 bg-card p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-cream">{label}</span>
        <span className="text-mist tabular-nums">{count}</span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full rounded-full bg-white/5 overflow-hidden"
        aria-hidden
      >
        <div
          className="h-full bg-flame"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-cream">
        {value.toLocaleString()}
      </p>
    </div>
  )
}

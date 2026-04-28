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
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(startOfWeek.getDate() - 7)

  const cgId = campground.id
  const [today, week, allTime] = await Promise.all([
    supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('campground_id', cgId)
      .gte('checked_in_at', startOfDay.toISOString()),
    supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('campground_id', cgId)
      .gte('checked_in_at', startOfWeek.toISOString()),
    supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('campground_id', cgId),
  ])

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Stats"
        title="Anonymous check-in counts"
        subtitle="No guest names, emails, or personal data — ever."
      />
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Today" value={today.count ?? 0} />
        <Stat label="Past 7 days" value={week.count ?? 0} />
        <Stat label="All time" value={allTime.count ?? 0} />
      </section>
      <section>
        <Eyebrow>What we track</Eyebrow>
        <p className="mt-2 text-sm text-mist leading-snug">
          Just count of check-ins per campground per time bucket. We do not
          surface — and could not surface — guest names, emails, profile
          fields, wave activity, or messages on this dashboard. RoadWave is
          guest-private by design.
        </p>
      </section>
    </div>
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

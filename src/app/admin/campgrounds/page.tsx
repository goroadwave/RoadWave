import { requireAdmin } from '@/lib/admin/guard'
import { EmptyState } from '@/components/admin/empty-state'
import { CampgroundRow } from '@/components/admin/campground-row'

type Campground = {
  id: string
  name: string
  slug: string
  city: string | null
  region: string | null
  is_active: boolean
  created_at: string
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled'
  plan: 'monthly' | 'annual' | null
  trial_ends_at: string | null
}

type BulletinCount = { campground_id: string }

export default async function CampgroundsPage() {
  const { supabase } = await requireAdmin()

  const [{ data: campgrounds }, { data: bulletins }] = await Promise.all([
    supabase
      .from('campgrounds')
      .select(
        'id, name, slug, city, region, is_active, created_at, subscription_status, plan, trial_ends_at',
      )
      .order('created_at', { ascending: false }),
    supabase.from('bulletins').select('campground_id'),
  ])

  const counts = new Map<string, number>()
  for (const b of (bulletins ?? []) as BulletinCount[]) {
    counts.set(b.campground_id, (counts.get(b.campground_id) ?? 0) + 1)
  }

  // Highlight rows whose trial expires within the next 7 days. Useful
  // for the founder to see at-a-glance who needs a follow-up nudge.
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const rows = ((campgrounds ?? []) as Campground[]).map((c) => {
    const trialEndMs = c.trial_ends_at ? new Date(c.trial_ends_at).getTime() : null
    const daysToExpiry =
      trialEndMs !== null
        ? Math.ceil((trialEndMs - now) / (24 * 60 * 60 * 1000))
        : null
    const expiringSoon =
      c.subscription_status === 'trial' &&
      trialEndMs !== null &&
      trialEndMs - now <= sevenDaysMs
    return {
      ...c,
      bulletin_count: counts.get(c.id) ?? 0,
      days_to_expiry: daysToExpiry,
      expiring_soon: expiringSoon,
    }
  })

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          Campground directory
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          Registered campgrounds ({rows.length})
        </h1>
        <p className="text-xs text-mist">
          Showing subscription status + trial expiry. Rows highlighted in
          amber are within 7 days of trial expiry.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No campgrounds yet"
          body="Newly registered campgrounds will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id}>
              <CampgroundRow row={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

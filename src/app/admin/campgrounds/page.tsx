import { requireAdmin } from '@/lib/admin/guard'
import { EmptyState } from '@/components/admin/empty-state'
import { CampgroundRow } from '@/components/admin/campground-row'

type Campground = {
  id: string
  name: string
  city: string | null
  region: string | null
  is_active: boolean
  created_at: string
}

type BulletinCount = { campground_id: string }

export default async function CampgroundsPage() {
  const { supabase } = await requireAdmin()

  const [{ data: campgrounds }, { data: bulletins }] = await Promise.all([
    supabase
      .from('campgrounds')
      .select('id, name, city, region, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('bulletins').select('campground_id'),
  ])

  const counts = new Map<string, number>()
  for (const b of (bulletins ?? []) as BulletinCount[]) {
    counts.set(b.campground_id, (counts.get(b.campground_id) ?? 0) + 1)
  }

  const rows = ((campgrounds ?? []) as Campground[]).map((c) => ({
    ...c,
    bulletin_count: counts.get(c.id) ?? 0,
  }))

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
          QR scan activity is not tracked yet — listed bulletins is the
          best campground-level activity signal we have today.
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

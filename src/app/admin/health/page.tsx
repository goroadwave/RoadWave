import { requireAdmin } from '@/lib/admin/guard'
import { RouteHealthList } from '@/components/admin/route-health-list'

export default async function HealthPage() {
  await requireAdmin()
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          System health
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          Routes + integrations
        </h1>
        <p className="text-xs text-mist">Refreshes every 5 minutes.</p>
      </header>
      <RouteHealthList />
    </div>
  )
}

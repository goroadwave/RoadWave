import { requireAdmin } from '@/lib/admin/guard'
import { EmptyState } from '@/components/admin/empty-state'
import { LeadRow, RequestRow } from '@/components/admin/inbox-row'

type LeadStatus = 'new' | 'read' | 'replied' | 'flagged'

type Lead = {
  id: string
  name: string | null
  email: string
  campground_name: string | null
  status: LeadStatus
  created_at: string
}

type Request = {
  id: string
  email: string
  campground_name: string | null
  status: LeadStatus
  created_at: string
}

export default async function InboxPage() {
  const { supabase } = await requireAdmin()
  const [{ data: leads }, { data: requests }] = await Promise.all([
    supabase
      .from('campground_leads')
      .select('id, name, email, campground_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('campground_requests')
      .select('id, email, campground_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          Founder inbox
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          Owner messages + demo requests
        </h1>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-cream">
          Campground demo leads ({(leads ?? []).length})
        </h2>
        {(leads ?? []).length === 0 ? (
          <EmptyState
            title="No demo leads yet"
            body="Submissions from /campgrounds#request-demo will land here."
          />
        ) : (
          <ul className="space-y-2">
            {(leads as Lead[]).map((row) => (
              <li key={row.id}>
                <LeadRow row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-cream">
          Campground requests ({(requests ?? []).length})
        </h2>
        {(requests ?? []).length === 0 ? (
          <EmptyState
            title="No campground requests yet"
            body="Submissions from the homepage 'Request a campground' form land here."
          />
        ) : (
          <ul className="space-y-2">
            {(requests as Request[]).map((row) => (
              <li key={row.id}>
                <RequestRow row={row} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-cream">Inbound email</h2>
        <EmptyState
          title="hello@ + safety@ ingestion"
          body="Email received at hello@getroadwave.com and safety@getroadwave.com is not yet stored in the database. Wire up an inbound email integration to populate this section."
          notConnected
        />
      </section>
    </div>
  )
}

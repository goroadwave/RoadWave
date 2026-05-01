import Link from 'next/link'

type Props = {
  status: 'trial' | 'active' | 'past_due' | 'canceled'
  trialEndsAt: string | null
}

// Compact strip rendered above the owner dashboard. Visible only when
// the campground is in 'trial' or in a non-active state that needs
// owner attention. Active campgrounds see nothing.
export function TrialBanner({ status, trialEndsAt }: Props) {
  if (status === 'active') return null

  if (status === 'trial' && trialEndsAt) {
    const ms = new Date(trialEndsAt).getTime() - Date.now()
    const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
    return (
      <div className="rounded-xl border border-flame/30 bg-flame/[0.08] px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-cream">
          <span className="font-semibold text-flame">Trial:</span>{' '}
          {days === 0 ? 'ends today' : `${days} day${days === 1 ? '' : 's'} left`}
        </div>
        <Link
          href="/owner/billing"
          className="text-xs font-semibold text-flame underline-offset-2 hover:underline shrink-0"
        >
          Manage subscription →
        </Link>
      </div>
    )
  }

  if (status === 'past_due') {
    return (
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-cream">
          <span className="font-semibold text-amber-300">Payment past due.</span>{' '}
          Update billing to keep your campground active.
        </div>
        <Link
          href="/owner/billing"
          className="text-xs font-semibold text-amber-300 underline-offset-2 hover:underline shrink-0"
        >
          Manage subscription →
        </Link>
      </div>
    )
  }

  if (status === 'canceled') {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-cream">
          <span className="font-semibold text-red-300">Subscription canceled.</span>{' '}
          Reactivate to keep your campground listing live.
        </div>
        <Link
          href="/owner/billing"
          className="text-xs font-semibold text-red-300 underline-offset-2 hover:underline shrink-0"
        >
          Manage subscription →
        </Link>
      </div>
    )
  }

  return null
}

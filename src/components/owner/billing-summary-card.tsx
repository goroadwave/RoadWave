import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'

// Compact billing summary on the owner dashboard Home tab. Shows the
// current subscription status, plan, and next renewal date when
// available, plus a Manage Billing button that opens the Stripe
// Customer Portal via /api/stripe/portal.
//
// The full billing surface (and any errors from a failed portal
// session) lives on /owner/billing — this card is just the at-a-glance
// summary for the dashboard.

type Plan = 'monthly' | 'annual' | null
type Status = 'trial' | 'active' | 'past_due' | 'canceled' | string

const PLAN_LABEL: Record<'monthly' | 'annual', string> = {
  monthly: 'Founding Pilot · Monthly',
  annual: 'Founding Pilot · Annual',
}

function statusLabel(s: Status): string {
  switch (s) {
    case 'trial':
      return 'Trial'
    case 'active':
      return 'Active'
    case 'past_due':
      return 'Past due'
    case 'canceled':
      return 'Canceled'
    default:
      return s
  }
}

function statusTone(s: Status): string {
  switch (s) {
    case 'active':
      return 'text-leaf'
    case 'past_due':
      return 'text-amber-300'
    case 'canceled':
      return 'text-red-300'
    case 'trial':
      return 'text-flame'
    default:
      return 'text-cream'
  }
}

type Props = {
  status: Status
  plan: Plan
  /** ISO timestamp; null when not yet known (e.g. mid-trial). */
  currentPeriodEnd: string | null
  /** ISO timestamp; only meaningful while status === 'trial'. */
  trialEndsAt: string | null
  /** True iff Stripe has issued a customer for this campground.
   *  Drives whether Manage Billing button is enabled. */
  stripeReady: boolean
}

export function BillingSummaryCard({
  status,
  plan,
  currentPeriodEnd,
  trialEndsAt,
  stripeReady,
}: Props) {
  const nextBill = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const trialEnds = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <section className="space-y-3">
      <Eyebrow>Billing</Eyebrow>
      <div className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-mist">
              Status
            </p>
            <p
              className={`mt-1 font-display text-lg font-extrabold ${statusTone(
                status,
              )}`}
            >
              {statusLabel(status)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-mist">
              Plan
            </p>
            <p className="mt-1 font-display text-lg font-extrabold text-cream">
              {plan ? PLAN_LABEL[plan] : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-mist">
              {status === 'trial' ? 'Trial ends' : 'Renews'}
            </p>
            <p className="mt-1 font-display text-lg font-extrabold text-cream">
              {status === 'trial' && trialEnds
                ? trialEnds
                : nextBill ?? '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {stripeReady ? (
            <a
              href="/api/stripe/portal"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              Manage Billing →
            </a>
          ) : (
            <p className="rounded-lg border border-flame/30 bg-flame/[0.06] px-3 py-2 text-xs text-cream">
              <span className="font-semibold text-flame">
                Billing portal unavailable.
              </span>{' '}
              No Stripe customer is linked to this campground yet.
            </p>
          )}
          <Link
            href="/owner/billing"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2 text-sm font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
          >
            Full billing details
          </Link>
        </div>
      </div>
    </section>
  )
}

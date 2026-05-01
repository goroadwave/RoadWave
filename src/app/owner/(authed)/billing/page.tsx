import { Eyebrow } from '@/components/ui/eyebrow'
import { TrialBanner } from '@/components/owner/trial-banner'
import { loadOwnerCampground } from '../_helpers'
import {
  PLAN_LABEL,
  PLAN_PRICE_USD,
  PLAN_INTERVAL_LABEL,
} from '@/lib/stripe/prices'
import { isStripeConfigured } from '@/lib/stripe/server'

export const dynamic = 'force-dynamic'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { campground } = await loadOwnerCampground()
  const sp = await searchParams
  const errorMessage = sp.error ? friendlyError(sp.error) : null

  if (!campground) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-extrabold text-cream">Billing</h1>
        <p className="text-mist text-sm">
          We don&apos;t see a campground linked to your account yet.
        </p>
      </div>
    )
  }

  const plan = campground.plan
  const status = campground.subscription_status
  const nextBillDate = campground.current_period_end
    ? new Date(campground.current_period_end).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null
  const trialEnds = campground.trial_ends_at
    ? new Date(campground.trial_ends_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const stripeReady = isStripeConfigured() && !!campground.stripe_customer_id

  return (
    <div className="space-y-5">
      <TrialBanner status={status} trialEndsAt={campground.trial_ends_at} />
      <header className="space-y-1">
        <Eyebrow>Billing</Eyebrow>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-tight">
          Subscription
        </h1>
      </header>

      {errorMessage && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="Plan"
          value={plan ? PLAN_LABEL[plan] : 'No plan yet'}
          sub={
            plan
              ? `$${PLAN_PRICE_USD[plan]} ${PLAN_INTERVAL_LABEL[plan]}`
              : 'Set one up at /start'
          }
        />
        <Stat
          label="Status"
          value={statusLabel(status)}
          sub={
            status === 'trial' && trialEnds
              ? `Trial ends ${trialEnds}`
              : status === 'active' && nextBillDate
                ? `Next billing date: ${nextBillDate}`
                : ''
          }
          tone={
            status === 'active'
              ? 'leaf'
              : status === 'past_due'
                ? 'amber'
                : status === 'canceled'
                  ? 'red'
                  : 'flame'
          }
        />
      </section>

      <section className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
        <p className="text-sm text-cream">
          Manage your card on file, switch plans, or cancel directly through
          the Stripe-hosted Customer Portal.
        </p>
        {stripeReady ? (
          <a
            href="/api/stripe/portal"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-flame/20 hover:bg-amber-400 transition-colors"
          >
            Manage Subscription →
          </a>
        ) : (
          <p className="rounded-xl border border-flame/30 bg-flame/[0.06] px-3 py-2 text-xs text-cream">
            <span className="font-semibold text-flame">
              Manage Subscription unavailable.
            </span>{' '}
            {!isStripeConfigured()
              ? 'Stripe is not configured yet. Once the founder adds the Stripe environment variables, this button will become active.'
              : 'No Stripe customer is linked to this campground. If you signed up before Stripe was wired up, please email hello@getroadwave.com.'}
          </p>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'flame' | 'leaf' | 'amber' | 'red'
}) {
  const valueClass =
    tone === 'leaf'
      ? 'text-leaf'
      : tone === 'amber'
        ? 'text-amber-300'
        : tone === 'red'
          ? 'text-red-300'
          : tone === 'flame'
            ? 'text-flame'
            : 'text-cream'
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-mist">{label}</p>
      <p className={`mt-1 font-display text-xl font-extrabold ${valueClass}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </div>
  )
}

function statusLabel(s: string): string {
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

function friendlyError(code: string): string {
  switch (code) {
    case 'stripe_not_configured':
      return 'Stripe is not configured yet. Hold tight — billing controls will appear here once the integration is live.'
    case 'no_campground':
      return 'We could not find a campground linked to your account.'
    case 'no_stripe_customer':
      return 'No Stripe customer is linked to this campground yet. If this is wrong, email hello@getroadwave.com.'
    case 'portal_failed':
      return 'Stripe could not open the Customer Portal. Please try again or email hello@getroadwave.com.'
    default:
      return code
  }
}

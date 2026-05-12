// Plan + price helpers. Prices are configured as env vars (the actual
// Stripe price IDs from the Stripe Dashboard) so the codebase doesn't
// need to know which mode (test vs live) the deployment is running in.

export type Plan = 'monthly' | 'annual'

export const PLAN_LABEL: Record<Plan, string> = {
  monthly: 'Founding Pilot · Monthly',
  annual: 'Founding Pilot · Annual',
}

export const PLAN_PRICE_USD: Record<Plan, number> = {
  monthly: 39,
  annual: 390,
}

export const PLAN_INTERVAL_LABEL: Record<Plan, string> = {
  monthly: 'per month',
  annual: 'per year',
}

export function getStripePriceId(plan: Plan): string | null {
  // Read STRIPE_PRICE_ID_* first (the spec-mandated names); fall back
  // to the legacy STRIPE_PRICE_* names so existing Vercel env vars
  // keep working without a rename. Both can be set; first non-empty
  // wins.
  if (plan === 'monthly') {
    return (
      process.env.STRIPE_PRICE_ID_MONTHLY ||
      process.env.STRIPE_PRICE_MONTHLY ||
      null
    )
  }
  return (
    process.env.STRIPE_PRICE_ID_ANNUAL ||
    process.env.STRIPE_PRICE_ANNUAL ||
    null
  )
}

export function isPlan(value: unknown): value is Plan {
  return value === 'monthly' || value === 'annual'
}

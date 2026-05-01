import Stripe from 'stripe'

// Returns true when all required Stripe env vars are present. Used by
// the public funnel pages + API routes to render a graceful "not
// connected yet" message when the founder hasn't wired up Stripe yet,
// instead of throwing 500s. The webhook secret is required by the
// webhook route only; the publishable key is required by the
// client-side redirect helper only — both are checked at their
// respective call sites.
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_MONTHLY &&
      process.env.STRIPE_PRICE_ANNUAL,
  )
}

let _stripe: Stripe | null = null

// Lazily-initialized server Stripe client. Throws if STRIPE_SECRET_KEY
// is missing — call sites should gate on isStripeConfigured() first
// and short-circuit with a friendly message.
export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Set it in the Vercel environment + .env.local before using Stripe APIs.',
    )
  }
  _stripe = new Stripe(key, {
    // Pin the API version so a Stripe SDK upgrade doesn't silently
    // change webhook payload shapes. Tracks the SDK's default for
    // this Stripe version.
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })
  return _stripe
}

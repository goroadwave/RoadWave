import Link from 'next/link'
import type { Metadata } from 'next'
import { CampgroundRileyButton } from '@/components/campgrounds/riley-campground-button'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { OwnerPilotForm } from '@/components/owner/owner-pilot-form'

export const metadata: Metadata = {
  title: 'Start Your Campground Pilot — RoadWave',
  description:
    'Set up your RoadWave QR guest hub. Short intake, then Stripe checkout. Pilot is free for 30 days. After that, Founding Campground plans start at $39/month. Cancel anytime.',
  alternates: { canonical: '/owners/start' },
}

// /owners/start is the canonical self-serve entry to RoadWave. The
// flow is: intake form → owner_signup_submissions row → Stripe
// Checkout → /owners/success → webhook provisions the campground.
//
// Querystring banners:
//   ?checkout=cancelled — visitor came back from a Stripe Checkout
//                         abandonment. We surface a friendly note so
//                         they know nothing was charged.
//   ?error=<code>       — checkout-creation error path; same shape as
//                         /owner/billing's error codes.

type SearchParams = Promise<{
  checkout?: string
  error?: string
}>

function friendlyCheckoutError(code: string): string | null {
  switch (code) {
    case 'stripe_not_configured':
      return "Payments aren't switched on yet. Submit the form below and we'll follow up by email."
    case 'invalid_request':
      return 'Something was off with that request. Please submit the form again.'
    case 'price_not_configured':
      return "We can't open Stripe Checkout right now — our pricing isn't configured. Please try again in a moment."
    case 'submission_not_found':
      return "We couldn't find your submission. Please fill out the form again."
    case 'stripe_session_no_url':
    case 'stripe_failed':
      return 'Stripe Checkout failed to open. Please try again or email hello@getroadwave.com.'
    default:
      return null
  }
}

export default async function OwnersStartPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const cancelled = sp.checkout === 'cancelled'
  const errorMessage = sp.error ? friendlyCheckoutError(sp.error) : null

  // Which Stripe plans the deploy actually has a price ID for. Drives
  // the form's plan picker — we hide options whose env var isn't set
  // so the visitor can't pick a plan that would 302-fail downstream.
  // Reads both the spec env names (STRIPE_PRICE_ID_*) and the legacy
  // aliases (STRIPE_PRICE_*) so either set works.
  const availablePlans: Array<'monthly' | 'annual'> = []
  if (
    process.env.STRIPE_PRICE_ID_MONTHLY ||
    process.env.STRIPE_PRICE_MONTHLY
  ) {
    availablePlans.push('monthly')
  }
  if (
    process.env.STRIPE_PRICE_ID_ANNUAL ||
    process.env.STRIPE_PRICE_ANNUAL
  ) {
    availablePlans.push('annual')
  }
  // Sanity fallback so the form always has something to submit; the
  // server action will still gate on whether Stripe is fully configured.
  if (availablePlans.length === 0) availablePlans.push('monthly')

  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-2xl" />
        </Link>
        <nav>
          <ul className="flex items-center gap-4 sm:gap-6 text-sm">
            <li>
              <Link
                href="/owners"
                className="text-mist hover:text-cream transition-colors"
              >
                Why RoadWave?
              </Link>
            </li>
            <li>
              <Link
                href="/demo"
                className="text-mist hover:text-cream transition-colors"
              >
                Demo
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-mist hover:text-cream transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="px-4 pt-8 pb-16 sm:pt-12 sm:pb-24">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="text-center space-y-3">
            <Eyebrow>Pilot intake</Eyebrow>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Start Your Campground Pilot
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Fill in the intake below, then head to secure Stripe
              Checkout. Pilot is free for 30 days. After that, Founding
              Campground plans start at $39/month. Cancel anytime.
            </p>
          </div>

          {cancelled && (
            <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-4 text-sm text-cream">
              <p className="font-semibold">
                Checkout cancelled — nothing was charged.
              </p>
              <p className="mt-1 text-mist leading-snug">
                Your intake details are still saved. When you&apos;re
                ready, hit{' '}
                <span className="text-cream">
                  Continue to Secure Checkout
                </span>{' '}
                below to pick up where you left off.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <OwnerPilotForm availablePlans={availablePlans} />

          <p className="text-center text-[11px] text-mist/70 leading-snug">
            Looking for the explanation page first?{' '}
            <Link
              href="/owners"
              className="text-flame underline-offset-2 hover:underline"
            >
              See RoadWave for campgrounds →
            </Link>
          </p>
        </div>
      </main>

      {/* Owner-flavoured Riley for the intake surface. Routes "Take
          the Tour" to /tour?audience=owner — never to a signup wall. */}
      <CampgroundRileyButton />
    </>
  )
}

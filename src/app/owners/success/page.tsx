import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Payment received — RoadWave',
  description:
    'Your campground pilot is being set up. Check your inbox for the welcome kit and dashboard magic link.',
  robots: { index: false, follow: false },
}

// Post-Stripe-Checkout landing page. Stripe redirects success_url here
// with ?session_id={CHECKOUT_SESSION_ID}; we resolve that back to the
// submission row so we can greet the owner by their campground name.
// The actual provisioning (auth user + campground row + onboarding
// email) happens asynchronously in the webhook — Stripe also fires
// checkout.session.completed at roughly the same time. Stripe's docs
// recommend treating the success page as "informational" and trusting
// the webhook for state, which is what we do here.

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ session_id?: string }>

export default async function OwnersSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const sessionId =
    typeof sp.session_id === 'string' && sp.session_id.startsWith('cs_')
      ? sp.session_id
      : null

  // Best-effort lookup so we can show the campground name and email
  // on this page. We DON'T provision anything here — that's the
  // webhook's job. If the lookup fails the page still works.
  let campgroundName: string | null = null
  let ownerEmail: string | null = null
  if (sessionId) {
    const admin = createSupabaseAdminClient()
    const { data: row } = await admin
      .from('owner_signup_submissions')
      .select('campground_name, email')
      .eq('stripe_session_id', sessionId)
      .maybeSingle<{ campground_name: string; email: string }>()
    if (row) {
      campgroundName = row.campground_name
      ownerEmail = row.email
    }
  }

  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-2xl" />
        </Link>
      </header>

      <main className="px-4 pt-8 pb-16 sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-xl space-y-8">
          <div className="text-center space-y-3">
            <Eyebrow>Payment received</Eyebrow>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
              {campgroundName
                ? `${campgroundName} is on RoadWave.`
                : "You're on RoadWave."}
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Thanks — your 14-day free trial is active and your card
              on file via Stripe is set up. We&apos;re provisioning
              your campground now.
            </p>
          </div>

          <ol className="space-y-3">
            <Step
              n={1}
              title="Check your inbox"
              body={
                ownerEmail
                  ? `We're emailing your onboarding kit to ${ownerEmail} — magic link to the dashboard, your QR code, and a front-desk script.`
                  : "We're emailing your onboarding kit — magic link to the dashboard, your QR code, and a front-desk script."
              }
            />
            <Step
              n={2}
              title="Open the dashboard"
              body="Tap the magic link in that email and you'll land directly on your owner dashboard. No password required."
            />
            <Step
              n={3}
              title="Print your QR + share with guests"
              body="Your branded campground guest page is live and ready to receive scans. Print the QR for the front desk, welcome packet, or activity board."
            />
          </ol>

          <div className="rounded-2xl border border-flame/30 bg-flame/[0.04] p-5 text-center space-y-2">
            <p className="text-sm text-cream leading-snug">
              Sometimes the welcome email takes a minute to arrive.
              Refresh your inbox in 30 seconds, and check spam if it
              still hasn&apos;t shown up after a few minutes.
            </p>
            <p className="text-[11px] text-mist leading-snug">
              Trouble getting in? Email{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>{' '}
              and a real human will get you set up.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/owner/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 transition-colors"
            >
              Go to the Owner Dashboard
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

function Step({
  n,
  title,
  body,
}: {
  n: number
  title: string
  body: string
}) {
  return (
    <li className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 flex items-start gap-3">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-flame text-night font-display text-sm font-extrabold"
        aria-hidden
      >
        {n}
      </span>
      <div>
        <h3 className="font-semibold text-cream text-sm sm:text-base">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-mist leading-relaxed">{body}</p>
      </div>
    </li>
  )
}

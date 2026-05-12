import Link from 'next/link'
import type { Metadata } from 'next'
import { ResendMagicLinkForm } from '@/components/owner/resend-magic-link-form'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Trial activated — RoadWave',
  description:
    'Your 14-day free trial is active. Check your inbox for the dashboard magic link.',
  robots: { index: false, follow: false },
}

// Post-Stripe-Checkout landing page. Three rendering branches based
// on the visitor's current auth state vs the email captured at
// checkout:
//
//   (a) Signed in AND user.email matches submission.email
//        → "Open Owner Dashboard" button → /owner/dashboard.
//
//   (b) Signed in but with a different email
//        → soft sign-out prompt, then they can resend / open dashboard
//          under the correct email.
//
//   (c) Not signed in
//        → "Email me my dashboard link" button that triggers a fresh
//          magic-link email via the resend server action.
//
// The actual campground provisioning (auth user + campground row +
// kit email) is the webhook's job. This page never activates anything
// — it's a read-only landing + a resend nudge.

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ session_id?: string }>

const SESSION_ID_RE = /^cs_(test|live)_[a-zA-Z0-9_-]{10,200}$/

export default async function OwnersSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const sessionId =
    typeof sp.session_id === 'string' && SESSION_ID_RE.test(sp.session_id)
      ? sp.session_id
      : null

  // Look up the submission so we can greet by campground name and
  // know which email to compare against the current session.
  let campgroundName: string | null = null
  let submissionEmail: string | null = null
  let submissionProvisioned = false
  if (sessionId) {
    const admin = createSupabaseAdminClient()
    const { data: row } = await admin
      .from('owner_signup_submissions')
      .select('campground_name, email, status')
      .eq('stripe_session_id', sessionId)
      .maybeSingle<{
        campground_name: string
        email: string
        status: string
      }>()
    if (row) {
      campgroundName = row.campground_name
      submissionEmail = row.email
      submissionProvisioned = row.status === 'provisioned'
    }
  }

  // Read the current auth state. Three branches drive the CTA below.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = user?.email ?? null
  const userMatchesSubmission =
    !!userEmail &&
    !!submissionEmail &&
    userEmail.toLowerCase() === submissionEmail.toLowerCase()

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
            <Eyebrow>Trial activated</Eyebrow>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
              {campgroundName
                ? `${campgroundName} is on RoadWave.`
                : "You're on RoadWave."}
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Your 14-day free trial is active. $0 due today — Stripe
              will charge your card when the trial ends, and you can
              cancel any time from the owner billing tab.
            </p>
          </div>

          <ol className="space-y-3">
            <Step
              n={1}
              title="Check your inbox"
              body={
                submissionEmail
                  ? `We're emailing your onboarding kit to ${submissionEmail} — magic link to the dashboard, your QR code, and a front-desk script.`
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

          {/* Auth-aware CTA */}
          <DashboardAccessCard
            sessionId={sessionId}
            userMatchesSubmission={userMatchesSubmission}
            userEmail={userEmail}
            submissionEmail={submissionEmail}
            submissionProvisioned={submissionProvisioned}
          />

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
        </div>
      </main>
    </>
  )
}

// Renders the right CTA for the visitor's auth state. Three branches:
// already in (open dashboard), wrong account (sign out first),
// not signed in (resend magic link).
function DashboardAccessCard({
  sessionId,
  userMatchesSubmission,
  userEmail,
  submissionEmail,
  submissionProvisioned,
}: {
  sessionId: string | null
  userMatchesSubmission: boolean
  userEmail: string | null
  submissionEmail: string | null
  submissionProvisioned: boolean
}) {
  // (a) Signed in with the right email
  if (userMatchesSubmission) {
    return (
      <div className="space-y-2">
        <Link
          href="/owner/dashboard"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 transition-colors"
        >
          Open Owner Dashboard
        </Link>
        <p className="text-center text-[11px] text-mist/70">
          Signed in as {userEmail}.
        </p>
      </div>
    )
  }

  // (b) Signed in but with a different email
  if (userEmail) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 space-y-3">
        <p className="text-sm text-cream leading-snug">
          You&apos;re currently signed in as{' '}
          <span className="text-cream font-semibold">{userEmail}</span>,
          but the checkout used a different email. To open the new
          campground&apos;s dashboard, sign out first and then use the
          magic link we just emailed to {submissionEmail ?? 'the checkout email'}.
        </p>
        <form action="/auth/sign-out?next=/owners/success" method="post">
          {/* Pass the session_id through so the page renders the same
              auth-aware copy after sign-out. */}
          {sessionId && (
            <input
              type="hidden"
              name="next"
              value={`/owners/success?session_id=${sessionId}`}
            />
          )}
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    )
  }

  // (c) Not signed in
  if (!sessionId) {
    // No session id at all — we can't drive a resend. Just point at
    // the regular owner login as a fallback.
    return (
      <div className="space-y-2">
        <Link
          href="/owner/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
        >
          Owner sign-in
        </Link>
      </div>
    )
  }

  if (!submissionProvisioned) {
    // Webhook may still be running. Don't show the resend button (it
    // would just say "not ready yet"). Tell the visitor to wait.
    return (
      <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-5 text-center space-y-2">
        <p className="text-sm text-cream leading-snug">
          We&apos;re finishing setup right now. Your onboarding email
          will land in the next 30 seconds.
        </p>
        <p className="text-[11px] text-mist/80">
          If it doesn&apos;t arrive, refresh this page and we&apos;ll
          show a resend button.
        </p>
      </div>
    )
  }

  // Provisioned, not signed in — happy path for the visitor who lost
  // / never received the kit email.
  return (
    <div className="space-y-2">
      <ResendMagicLinkForm sessionId={sessionId} />
      <p className="text-center text-[11px] text-mist/70">
        Goes to the email you used at checkout. Already have the link?
        Just click it.
      </p>
    </div>
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

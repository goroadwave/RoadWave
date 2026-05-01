import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isStripeConfigured } from '@/lib/stripe/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Welcome to RoadWave — Your Pilot Is Active',
  description: 'Your campground pilot is set up. Check your email for the kit.',
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string
    submission_id?: string
    pending?: string
  }>
}) {
  const sp = await searchParams
  const admin = createSupabaseAdminClient()

  // Two paths land here:
  //   (a) Stripe-completed: ?session_id=cs_... — provisioned by webhook.
  //   (b) Pre-Stripe-config: ?submission_id=...&pending=stripe — funnel
  //       captured the form but Stripe isn't wired up yet, so we show
  //       a "we'll follow up" message instead of a checkout receipt.
  let submission: {
    id: string
    campground_name: string
    owner_name: string
    email: string
    status: string
  } | null = null

  if (sp.session_id) {
    const { data } = await admin
      .from('owner_signup_submissions')
      .select('id, campground_name, owner_name, email, status')
      .eq('stripe_session_id', sp.session_id)
      .maybeSingle()
    submission = data ?? null
  } else if (sp.submission_id) {
    const { data } = await admin
      .from('owner_signup_submissions')
      .select('id, campground_name, owner_name, email, status')
      .eq('id', sp.submission_id)
      .maybeSingle()
    submission = data ?? null
  }

  const pendingStripe = sp.pending === 'stripe' || !isStripeConfigured()
  const provisioned = submission?.status === 'provisioned'

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-3xl" />
      </Link>
      <main className="w-full max-w-xl rounded-2xl border border-flame/30 bg-card p-6 sm:p-8 shadow-2xl shadow-black/40 space-y-5">
        <div className="space-y-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
            {pendingStripe ? 'Submission saved' : 'Welcome to RoadWave'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-cream">
            {pendingStripe
              ? 'We got your details.'
              : 'Your campground pilot is active.'}
          </h1>
        </div>

        {submission && (
          <p className="rounded-xl border border-white/10 bg-night/40 px-4 py-3 text-sm text-cream">
            <span className="text-mist">Campground:</span>{' '}
            <span className="font-semibold">{submission.campground_name}</span>
          </p>
        )}

        {pendingStripe ? (
          <div className="space-y-3 text-sm text-cream/90 leading-relaxed">
            <p>
              Stripe billing isn&apos;t fully wired up yet — your submission is
              saved and we&apos;ll reach out by email
              {submission ? ` at ${submission.email}` : ''} to finalize your
              founding pilot.
            </p>
            <p className="text-xs text-mist">
              In the meantime, the rest of the funnel is ready: your branded
              campground page, printable QR, and onboarding kit will land in
              your inbox once your subscription is set up.
            </p>
          </div>
        ) : provisioned ? (
          <div className="space-y-3 text-sm text-cream/90 leading-relaxed">
            <p>
              Thanks for joining the founding pilot. We&apos;ve emailed your
              onboarding kit{submission ? ` to ${submission.email}` : ''} —
              it includes your QR code, front-desk script, suggested
              placements, and a magic link to your dashboard.
            </p>
            <p className="text-xs text-mist">
              Didn&apos;t get the email? Check spam, then{' '}
              <Link
                href="/contact"
                className="text-flame underline-offset-2 hover:underline"
              >
                drop us a note
              </Link>{' '}
              and we&apos;ll resend.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-cream/90 leading-relaxed">
            <p>
              Payment received. We&apos;re finishing your setup — you should
              get an onboarding email
              {submission ? ` at ${submission.email}` : ''} within a minute.
            </p>
            <p className="text-xs text-mist">
              That email contains your QR code, front-desk script, and a magic
              link to your dashboard.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/owner/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
          >
            Sign in to your dashboard
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-cream px-5 py-2.5 text-sm font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
          >
            Contact support
          </Link>
        </div>
      </main>
    </div>
  )
}

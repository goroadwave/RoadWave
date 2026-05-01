import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerSignupForm } from '@/components/owner/owner-signup-form'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Start My Campground Pilot — RoadWave',
  description:
    'Activate RoadWave at your campground. $39/month founding pilot. Cancel anytime.',
}

export default async function OwnerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/owner')

  const sp = await searchParams
  const errorMessage = sp.error ? friendlyError(sp.error) : null

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-3xl" />
      </Link>
      <main className="w-full max-w-xl rounded-2xl border border-white/5 bg-card p-6 sm:p-8 shadow-2xl shadow-black/40">
        <div className="space-y-2 mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
            Founding Campground Pilot · 14-day trial
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-cream">
            Start My Campground Pilot
          </h1>
          <p className="text-sm text-mist leading-relaxed">
            Your campground gets a branded guest page for updates, meetup
            prompts, shared-interest camper discovery, privacy modes, and
            aggregate engagement stats.
          </p>
          <p className="text-sm text-mist leading-relaxed">
            Two minutes to set up. We&apos;ll send your QR code, front-desk
            script, and welcome packet to your inbox when you activate your
            campground.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <OwnerSignupForm />

        <p className="mt-5 text-center text-xs text-mist">
          Already have a campground?{' '}
          <Link
            href="/owner/login"
            className="text-flame underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
          .
        </p>
      </main>
    </div>
  )
}

function friendlyError(code: string): string {
  switch (code) {
    case 'stripe_not_configured':
      return 'Payments are not configured yet — your submission was saved and we\'ll follow up by email.'
    case 'invalid_request':
      return 'Something went wrong with your request. Please try again.'
    case 'price_not_configured':
      return 'Selected plan is not configured. Please email hello@getroadwave.com.'
    case 'submission_not_found':
      return 'We could not find your submission. Please re-fill the form.'
    case 'stripe_failed':
    case 'stripe_session_no_url':
      return 'Stripe could not create a checkout session. Please try again or email hello@getroadwave.com.'
    default:
      return code
  }
}

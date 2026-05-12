import Link from 'next/link'
import type { Metadata } from 'next'
import { ConfirmSignInForm } from '@/components/auth/confirm-sign-in-form'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Sign in — RoadWave',
  robots: { index: false, follow: false },
}

// Scanner-resistant confirmation step for email magic links.
//
// The webhook + resend action build a URL of the form:
//   https://www.getroadwave.com/auth/sign-in
//     ?th=<token_hash>
//     &email=<owner_email_for_display>
//     &next=<post-signin-path>
//
// Gmail / Outlook / corporate gateways pre-fetch every link in
// incoming email for malware scanning. If the email contained the
// raw Supabase magic-link URL, that pre-fetch would consume the OTP
// and the human would land on "otp_expired" by the time they
// clicked. By inserting THIS page in front:
//
//   1. The pre-fetcher GETs /auth/sign-in?th=… → renders this page
//      → does nothing else → OTP stays valid.
//   2. The human opens the email, clicks the button → form POST to
//      the verify server action → Supabase verifyOtp consumes the
//      OTP → session set → redirect to /owner/dashboard.
//
// If the user lands here with ?error=expired (the action's failure
// branch), we render a friendly "link expired" card instead with a
// clear path to a fresh link.

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{
  th?: string
  email?: string
  next?: string
  error?: string
}>

const TOKEN_HASH_RE = /^[A-Za-z0-9_-]{16,512}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function SignInConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const tokenHash =
    typeof sp.th === 'string' && TOKEN_HASH_RE.test(sp.th) ? sp.th : null
  const email =
    typeof sp.email === 'string' && EMAIL_RE.test(sp.email) ? sp.email : null
  const next =
    typeof sp.next === 'string' && sp.next.startsWith('/') && !sp.next.startsWith('//')
      ? sp.next
      : '/owner/dashboard'
  const isExpired = sp.error === 'expired'

  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
      </header>

      <main className="px-4 pt-8 pb-16 sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-md space-y-6">
          {isExpired ? (
            <ExpiredLinkCard email={email} />
          ) : !tokenHash ? (
            <MissingTokenCard />
          ) : (
            <ConfirmCard tokenHash={tokenHash} email={email} next={next} />
          )}
        </div>
      </main>
    </>
  )
}

function ConfirmCard({
  tokenHash,
  email,
  next,
}: {
  tokenHash: string
  email: string | null
  next: string
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="space-y-2">
        <Eyebrow>One more tap</Eyebrow>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
          You&apos;re almost in.
        </h1>
        <p className="text-mist text-sm sm:text-base leading-relaxed">
          For your security, RoadWave finishes magic-link sign-in
          here — not in your email client. Tap the button below to
          open your dashboard.
        </p>
      </div>
      <ConfirmSignInForm tokenHash={tokenHash} email={email} next={next} />
      <p className="text-[11px] text-mist/70 leading-snug">
        Didn&apos;t request this email?{' '}
        <a
          href="mailto:hello@getroadwave.com"
          className="text-flame underline-offset-2 hover:underline"
        >
          Let us know
        </a>
        .
      </p>
    </div>
  )
}

function ExpiredLinkCard({ email }: { email: string | null }) {
  return (
    <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-6 space-y-3 text-center">
      <Eyebrow>Link expired</Eyebrow>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-[1.05]">
        That sign-in link is no longer valid.
      </h1>
      <p className="text-mist text-sm leading-relaxed">
        Magic-link sign-ins are single-use and expire after an hour.
        Request a fresh one — it&apos;ll land in your inbox{' '}
        {email ? `at ${email}` : ''} in a few seconds.
      </p>
      <div className="pt-2">
        <Link
          href="/owner/login"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-leaf/15 hover:bg-leaf/85 transition-colors"
        >
          Send me a fresh dashboard link
        </Link>
      </div>
      <p className="text-[11px] text-mist/80 leading-snug pt-1">
        Still stuck? Email{' '}
        <a
          href="mailto:hello@getroadwave.com"
          className="text-flame underline-offset-2 hover:underline"
        >
          hello@getroadwave.com
        </a>{' '}
        and a real human will get you in.
      </p>
    </div>
  )
}

function MissingTokenCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3 text-center">
      <Eyebrow>Missing link</Eyebrow>
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-[1.05]">
        We couldn&apos;t read that sign-in link.
      </h1>
      <p className="text-mist text-sm leading-relaxed">
        The link in your email may have been mangled by an email
        client. Request a fresh one — it&apos;ll be on its way in
        seconds.
      </p>
      <div className="pt-2">
        <Link
          href="/owner/login"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-leaf/15 hover:bg-leaf/85 transition-colors"
        >
          Send me a fresh dashboard link
        </Link>
      </div>
    </div>
  )
}

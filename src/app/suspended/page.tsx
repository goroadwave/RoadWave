import Link from 'next/link'
import type { Metadata } from 'next'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Account under review — RoadWave',
  description: 'This RoadWave account is suspended pending review.',
  robots: { index: false, follow: false },
}

// Landing page for users whose account is suspended pending review. Reachable
// from the (app) and (authed) owner layouts when profiles.suspended_at is set.
export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-3xl" />
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/50 space-y-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
          Account under review
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          We&apos;re reviewing this account.
        </h1>
        <p className="text-sm text-mist leading-relaxed">
          Your RoadWave account is suspended pending review of a recent
          report. You can&apos;t use the app while review is in progress.
        </p>
        <p className="text-sm text-mist leading-relaxed">
          Reviews are part of RoadWave&apos;s trust and safety process. We&apos;ll
          email you when there&apos;s an update. To respond, ask a question, or
          contest the suspension, write to{' '}
          <a
            href="mailto:safety@getroadwave.com"
            className="text-flame underline-offset-2 hover:underline"
          >
            safety@getroadwave.com
          </a>
          .
        </p>
        <div className="pt-2">
          <form action="/auth/sign-out?next=/" method="post">
            <button
              type="submit"
              className="text-sm text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

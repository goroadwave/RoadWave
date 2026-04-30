import Link from 'next/link'
import type { Metadata } from 'next'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Goodbye — RoadWave',
  description: 'Your RoadWave account has been deleted.',
  robots: { index: false, follow: false },
}

// Public confirmation page after a self-serve deletion. The session cookie
// the user lands here with is no longer backed by a real auth.users row.
export default function GoodbyePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-3xl" />
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/50 space-y-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
          Account deleted
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream">
          Wave goodbye 👋
        </h1>
        <p className="text-sm text-mist leading-relaxed">
          Your RoadWave account and associated data have been deleted. We&apos;ve
          emailed a receipt to the address you had on file.
        </p>
        <p className="text-sm text-mist leading-relaxed">
          Concerns about this deletion, or didn&apos;t request it? Write to{' '}
          <a
            href="mailto:safety@getroadwave.com"
            className="text-flame underline-offset-2 hover:underline"
          >
            safety@getroadwave.com
          </a>
          .
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            Back to RoadWave
          </Link>
        </div>
      </main>
    </div>
  )
}

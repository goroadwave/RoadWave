import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Contact RoadWave',
  description:
    'Three ways to reach RoadWave: hello@ for general questions, safety@ for safety / legal / urgent matters, and 911 first for emergencies.',
}

export default function ContactPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Home
        </Link>
      </header>

      <main className="px-4 py-12 sm:py-20">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="text-center space-y-3">
            <Eyebrow>Contact</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Get in touch
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Pick the option that fits.
            </p>
          </div>

          <div className="space-y-3">
            <ContactRow
              eyebrow="General questions"
              email="hello@getroadwave.com"
              variant="default"
            />
            <ContactRow
              eyebrow="Safety reports, legal requests, account issues, or urgent concerns"
              email="safety@getroadwave.com"
              variant="urgent"
            />
            <EmergencyRow />
          </div>

          <p className="text-center text-xs text-mist/80 leading-relaxed">
            For the full process when something is wrong, see our{' '}
            <Link
              href="/safety"
              className="text-flame underline-offset-2 hover:underline"
            >
              Safety
            </Link>{' '}
            and{' '}
            <Link
              href="/safety-protocol"
              className="text-flame underline-offset-2 hover:underline"
            >
              Trust &amp; Safety Protocol
            </Link>{' '}
            pages.
          </p>
        </div>
      </main>
    </>
  )
}

function ContactRow({
  eyebrow,
  email,
  variant,
}: {
  eyebrow: string
  email: string
  variant: 'default' | 'urgent'
}) {
  const cardClass =
    variant === 'urgent'
      ? 'rounded-2xl border border-flame/40 bg-flame/[0.06] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4'
      : 'rounded-2xl border border-white/10 bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4'
  return (
    <section className={cardClass}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame leading-tight">
          {eyebrow}
        </p>
        <p className="mt-1 font-display text-base sm:text-lg font-extrabold text-cream break-all">
          {email}
        </p>
      </div>
      <a
        href={`mailto:${email}`}
        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
      >
        Email
      </a>
    </section>
  )
}

function EmergencyRow() {
  return (
    <section className="rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300 leading-tight">
          Emergencies
        </p>
        <p className="mt-1 font-display text-base sm:text-lg font-extrabold text-cream">
          Call 911 first, then notify campground staff.
        </p>
        <p className="mt-1 text-xs text-mist">
          RoadWave is not an emergency service.
        </p>
      </div>
      <a
        href="tel:911"
        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 text-white px-4 py-2 text-sm font-semibold shadow-md shadow-red-500/20 hover:bg-red-400 transition-colors"
      >
        Call 911
      </a>
    </section>
  )
}

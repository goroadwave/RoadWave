import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Contact RoadWave',
  description:
    "Two ways to reach RoadWave: hello@ for general questions and safety@ for urgent or legal matters.",
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
              A real human reads every message. Two inboxes — pick the one
              that fits.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard
              eyebrow="General"
              title="hello@getroadwave.com"
              tagline="Questions, ideas, partnership conversations."
              examples={[
                'Help getting started',
                'Feedback or feature ideas',
                'Press, partnerships, or campground onboarding',
                'Anything else that doesn’t fit below',
              ]}
              email="hello@getroadwave.com"
              variant="default"
            />
            <ContactCard
              eyebrow="Safety · Legal · Urgent"
              title="safety@getroadwave.com"
              tagline="Use this for anything time-sensitive or sensitive."
              examples={[
                'Reporting harassment, threats, or unsafe behavior',
                'Manual data deletion requests (e.g. locked-out accounts)',
                'Law enforcement and legal process',
                'Suspected privacy or security incidents',
              ]}
              email="safety@getroadwave.com"
              variant="urgent"
            />
          </div>

          <p className="text-center text-xs text-mist/80 leading-relaxed">
            <strong className="text-cream">Emergencies go to 911 first.</strong>{' '}
            RoadWave is not an emergency service and we don&apos;t monitor
            inboxes around the clock. For the full process when something is
            wrong, see our{' '}
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

function ContactCard({
  eyebrow,
  title,
  tagline,
  examples,
  email,
  variant,
}: {
  eyebrow: string
  title: string
  tagline: string
  examples: string[]
  email: string
  variant: 'default' | 'urgent'
}) {
  const cardClass =
    variant === 'urgent'
      ? 'rounded-2xl border border-flame/40 bg-flame/[0.06] p-5 sm:p-6 space-y-3'
      : 'rounded-2xl border border-white/10 bg-card p-5 sm:p-6 space-y-3'
  const ctaClass =
    variant === 'urgent'
      ? 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors'
      : 'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2.5 font-semibold hover:bg-flame/20 transition-colors'
  return (
    <section className={cardClass}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          {eyebrow}
        </p>
        <p className="mt-0.5 font-display text-base sm:text-lg font-extrabold text-cream break-all">
          {title}
        </p>
        <p className="text-xs text-mist mt-1 leading-snug">{tagline}</p>
      </div>
      <ul className="space-y-1.5">
        {examples.map((e) => (
          <li key={e} className="flex items-start gap-2 text-sm text-mist">
            <span aria-hidden className="text-flame mt-1">
              •
            </span>
            <span>{e}</span>
          </li>
        ))}
      </ul>
      <a href={`mailto:${email}`} className={ctaClass}>
        Email {email}
      </a>
    </section>
  )
}

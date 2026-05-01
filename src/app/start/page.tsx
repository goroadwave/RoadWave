import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Activate RoadWave at Your Campground — Founding Pilot',
  description:
    'Give your guests a simple, private way to meet other campers through a QR code at check-in. $39/month founding pilot. Cancel anytime.',
}

const GUEST_BENEFITS: string[] = [
  'Private campground check-in',
  'Shared-interest discovery',
  'Visible / Quiet / Invisible / Campground Updates Only modes',
  'Mutual waves before messaging',
  'No exact site numbers',
  'No public group chat',
]

const OWNER_KIT: string[] = [
  'Branded campground QR page',
  'Printable QR code',
  'Welcome-packet insert',
  'Front-desk script',
  'Activity-board flyer',
  'Safety and privacy language',
  'Optional setup call',
]

const PRICING_BULLETS: string[] = [
  '$39/month',
  'Cancel anytime',
  'Limited founding rate',
  'No hardware',
  'No app-store setup',
]

export default function StartPage({
  searchParams: _searchParams,
}: {
  searchParams?: Promise<{ canceled?: string }>
}) {
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
                href="/owner/login"
                className="text-mist hover:text-cream transition-colors"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 pt-12 pb-12 sm:pt-20 sm:pb-16">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <Eyebrow>Self-serve · 14-day trial</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Activate RoadWave at Your Campground
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              A QR-code amenity that helps your guests meet campers who share
              their interests — or just see your bulletins and meetups, on
              their terms. Visible, Quiet, Invisible, or Campground Updates
              Only.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link
                href="/owner/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Start My Campground Pilot
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
              >
                Watch 90-Second Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Guest benefits */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>What your guests get</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                A friendlier campground, on their terms.
              </h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">
              {GUEST_BENEFITS.map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-white/5 bg-card px-4 py-3 text-sm text-cream flex items-start gap-2"
                >
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Owner kit */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>What you get</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Everything you need to launch in an afternoon.
              </h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">
              {OWNER_KIT.map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-flame/30 bg-card px-4 py-3 text-sm text-cream flex items-start gap-2"
                >
                  <span className="text-flame mt-0.5" aria-hidden>
                    ★
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>Founding Campground Pilot</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                $39/month. Limited founding rate.
              </h2>
              <p className="text-mist text-base sm:text-lg">
                Cancel anytime. Annual option also available at checkout
                ($390/year).
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 max-w-xl mx-auto">
              {PRICING_BULLETS.map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-white/5 bg-card px-4 py-3 text-sm text-cream flex items-start gap-2"
                >
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Ready to activate your campground?
            </h2>
            <p className="text-mist text-base sm:text-lg">
              Two minutes to sign up. Cancel anytime. No hardware. No
              app-store setup.
            </p>
            <Link
              href="/owner/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
            >
              Start My Campground Pilot
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}

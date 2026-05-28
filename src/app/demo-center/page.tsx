import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

// RoadWave Demo Center -- the polished sales/onboarding hub a campground
// owner receives. Public, no auth, no DB queries (all static content).
// Layout mirrors the latest marketing prototype: a top nav with a green
// trial CTA, a 2-column hero panel (copy + check-in illustration), a
// four-up benefits row, the three demo paths, and a closing trial CTA.
//
// Routes preserved exactly:
//   Camper Demo        -> /demo-center/camper
//   Guided Walkthrough -> /demo-center/walkthrough
//   Owner Dashboard    -> /demo-center/owner
//   Start Free 30-Day Trial -> /owners/start   (canonical Stripe trial intake)

export const metadata = {
  title: 'RoadWave Demo Center',
  description:
    'See how RoadWave works for campers and campground owners. Camper QR experience, owner dashboard, office messages, bulletins, meetups, weather alerts, and optional Camper Connections.',
}

// Shared darker-green CTA used in the nav, hero, and closing section.
// Color/glow/hover/focus live in the .trial-cta class (globals.css); the
// classes here are layout + sizing only.
const TRIAL_HREF = '/owners/start'
// Top-nav trial button: compact on phones (smaller text + tighter
// padding), never wraps, and shrink-0 so it stays put without crowding
// the logo. Steps up to the roomier size from sm+.
const greenCta =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold sm:px-5 sm:py-2.5 sm:text-sm trial-cta'

const BENEFITS: { icon: string; title: string; body: string }[] = [
  {
    icon: '🏕️',
    title: 'Campground info in one scan',
    body: 'Guests can quickly find Wi-Fi, maps, rules, amenities, check-in details, and important park info without calling the office.',
  },
  {
    icon: '🖥️',
    title: 'Owner dashboard',
    body: 'Campground owners manage updates, meetups, weather notices, guest messages, QR materials, and settings from one simple place.',
  },
  {
    icon: '💬',
    title: 'Office messages',
    body: 'Campers can privately contact the office for help, questions, maintenance, or safety concerns without creating a public chat.',
  },
  {
    icon: '🤝',
    title: 'Optional camper connections',
    body: 'Campers who want to meet others can join privacy-first Camper Connections using shared interests and mutual Waves.',
  },
]

const DEMOS: {
  href: string
  icon: string
  title: string
  body: string
}[] = [
  {
    href: '/demo-center/camper',
    icon: '📱',
    title: 'Camper Demo',
    body: 'See what guests experience when they scan your QR code for park info, office help, updates, meetups, and optional Camper Connections.',
  },
  {
    href: '/demo-center/walkthrough',
    icon: '🚶',
    title: 'Guided Walkthrough',
    body: 'Take a quick step-by-step tour that explains how RoadWave works for both owners and campers without needing to click around first.',
  },
  {
    href: '/demo-center/owner',
    icon: '🧭',
    title: 'Owner Dashboard Demo',
    body: 'Preview the owner side: update campground info, post bulletins, create meetups, manage messages, and control QR page settings.',
  },
]

export default function DemoCenterPage() {
  return (
    <main className="flex-1">
      {/* 1. Top nav bar */}
      <header className="px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          {/* Logo returns to the Demo Center hub — viewers stay inside the
              demo unless they tap an explicit trial CTA. */}
          <Link href="/demo-center" className="inline-block shrink-0">
            <Logo className="text-xl sm:text-3xl" />
          </Link>
          <Link href={TRIAL_HREF} className={greenCta}>
            Start Free 30-Day Trial
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-8 sm:pb-12 space-y-16 sm:space-y-24">
        {/* 2 + 3. Hero panel */}
        <section className="mt-4 sm:mt-6 rounded-3xl border border-white/10 bg-card/70 shadow-xl shadow-black/20 overflow-hidden">
          <div className="grid items-stretch lg:grid-cols-2">
            <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.25em] text-flame font-semibold">
                Campground guest experience demo
              </p>
              <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.08] tracking-tight text-cream">
                Enhance Your Campground Experience with RoadWave
              </h1>
              <p className="mt-5 text-base sm:text-lg text-mist leading-relaxed max-w-md">
                A simple QR-powered guest communication and camper
                connection tool built for modern campgrounds.
              </p>
              <div className="mt-7">
                <Link
                  href={TRIAL_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold trial-cta"
                >
                  Start Free 30-Day Trial
                </Link>
              </div>
            </div>

            <div className="relative min-h-[260px] sm:min-h-[340px] lg:min-h-full p-4 sm:p-6 lg:py-8 lg:pr-8 lg:pl-0">
              <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element -- static hero photo; plain <img> keeps this server component config-free */}
                <img
                  src="/images/camper-checking-in.jpeg"
                  alt="A camper checking in and scanning a RoadWave QR code at a campground front desk"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Benefits */}
        <section>
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-cream leading-tight">
              Everything your campground needs in one simple experience.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-mist leading-relaxed">
              Give guests instant access to campground info while giving
              your team a cleaner, more organized way to manage
              communication, updates, and optional camper connections.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <article
                key={b.title}
                className="rounded-2xl border border-white/10 bg-card/60 p-6"
              >
                <span
                  aria-hidden
                  className="block text-[42px] leading-none"
                >
                  {b.icon}
                </span>
                <h3 className="mt-4 font-display text-lg font-extrabold text-cream leading-snug">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm text-mist leading-relaxed">
                  {b.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 5. Demo paths */}
        <section>
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-cream leading-tight">
              Choose the demo path that fits you best.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-mist leading-relaxed">
              Start with the owner view, walk through the full experience,
              or preview what campers see when they scan your campground QR
              code.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {DEMOS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group flex flex-col rounded-2xl border border-white/10 bg-card/60 p-6 transition-colors hover:border-flame/40 hover:bg-card"
              >
                <span aria-hidden className="block text-[42px] leading-none">
                  {d.icon}
                </span>
                <h3 className="mt-4 font-display text-lg font-extrabold text-cream leading-snug">
                  {d.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-mist leading-relaxed">
                  {d.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-flame">
                  Open demo
                  <span
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-6 text-xs text-mist leading-relaxed">
            Demo Mode only — no real guest data, no signup required.
          </p>
        </section>

        {/* 6. Bottom CTA */}
        <section className="rounded-3xl border border-flame/30 bg-flame/[0.06] px-6 py-12 sm:px-10 sm:py-16 text-center">
          <div className="mx-auto max-w-2xl space-y-5">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-cream leading-tight">
              Ready to activate your campground?
            </h2>
            <p className="text-base sm:text-lg text-mist leading-relaxed">
              Start with a 30-day trial and see how RoadWave can improve
              guest communication, park updates, reviews, rebookings, and
              camper connection.
            </p>
            <div className="pt-1">
              <Link
                href={TRIAL_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold trial-cta"
              >
                Start Free 30-Day Trial
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

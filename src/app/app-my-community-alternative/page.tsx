import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

// SEO comparison page: "App My Community Alternative for Campgrounds".
// Content (copy, table, FAQ, JSON-LD) comes from the source HTML provided
// by the marketing team; the implementation uses RoadWave components and
// design tokens so the page matches the rest of the site (no inline CSS,
// no placeholder nav/footer). SiteFooter is appended by the root layout.

const CANONICAL = 'https://www.getroadwave.com/app-my-community-alternative'

export const metadata: Metadata = {
  title: 'App My Community Alternative for Campgrounds | RoadWave',
  description:
    'Looking for an App My Community alternative? RoadWave is the month-to-month campground guest app built for guest connection — no annual contract, free pilot, cancel anytime.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'App My Community Alternative for Campgrounds | RoadWave',
    description:
      'The month-to-month campground guest app built for guest connection. No annual contract. Free pilot. Cancel anytime.',
    type: 'website',
    url: CANONICAL,
  },
  twitter: { card: 'summary_large_image' },
}

// Comparison rows. `rwCheck` flips on the amber check mark next to the
// RoadWave value. The last row intentionally checkmarks AMC for fairness.
const COMPARE: {
  feature: string
  rw: string
  amc: string
  rwCheck?: boolean
  amcCheck?: boolean
}[] = [
  { feature: 'Pricing', rw: 'Flat $39 / month', amc: 'Custom annual pricing' },
  {
    feature: 'Commitment',
    rw: 'Month-to-month, cancel anytime',
    amc: 'Annual contracts only',
    rwCheck: true,
  },
  {
    feature: 'Try before you buy',
    rw: 'Free 30-day pilot',
    amc: 'Demo app (not for public release)',
    rwCheck: true,
  },
  {
    feature: 'Time to launch',
    rw: 'Minutes — print one QR code',
    amc: '~2 weeks for a custom build',
    rwCheck: true,
  },
  {
    feature: "What it's built for",
    rw: 'Guests connecting with each other',
    amc: 'Park-to-guest communication & operations',
  },
  {
    feature: 'Guest-to-guest connection',
    rw: 'Core feature — waves & shared interests',
    amc: 'Not the focus',
    rwCheck: true,
  },
  {
    feature: 'Guest privacy controls',
    rw: 'Visible / Quiet / Invisible · no site numbers',
    amc: 'Standard app messaging',
    rwCheck: true,
  },
  {
    feature: 'Guest access',
    rw: 'Scan a QR — instant, nothing to install',
    amc: 'Branded app (browser version available)',
    rwCheck: true,
  },
  {
    feature: 'AI campground host',
    rw: 'Riley, built in',
    amc: '—',
    rwCheck: true,
  },
  {
    feature: 'Fully custom-branded app',
    rw: 'Lightweight branded page',
    amc: 'Fully custom app',
    amcCheck: true,
  },
]

const TILES: { icon: string; title: string; body: string }[] = [
  {
    icon: '🗓️',
    title: 'No annual contract to sign',
    body: 'Pay month-to-month and cancel anytime. Try it through one busy season without locking in a year up front.',
  },
  {
    icon: '⚡',
    title: 'Live in minutes, not weeks',
    body: "No custom app to build and no app-store wait. Fill out a short intake, print the QR, and you're running.",
  },
  {
    icon: '👋',
    title: 'Built for guests to meet',
    body: 'Solo travelers and weekenders find their people through private, opt-in waves — not a noisy public group chat.',
  },
  {
    icon: '🔒',
    title: 'Privacy guests actually trust',
    body: 'Visible, Quiet, or Invisible. No exact site numbers. Nothing posted publicly, ever.',
  },
]

// Rendered FAQ uses the conversational variants; the JSON-LD below uses
// the canonical Q&A copy from the source HTML for rich-result eligibility.
const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is RoadWave a replacement for App My Community?',
    a: 'It can be, if your goal is guest connection and flexibility rather than a full custom operations app. RoadWave focuses on helping campers find and meet each other, month-to-month, with no build project. App My Community is a broader, custom-branded communications and operations platform sold annually.',
  },
  {
    q: 'Does RoadWave require an annual contract?',
    a: 'No. RoadWave is a flat $39 per month, month-to-month, and you can cancel anytime. App My Community offers annual contracts only.',
  },
  {
    q: 'Do my guests need to download an app?',
    a: "No. Guests scan a QR code and a web page opens instantly — nothing to install. They're checked in for 24 hours and choose how visible they want to be.",
  },
  {
    q: 'How much does RoadWave cost?',
    a: 'A flat $39 per month per campground at the Founding Campground rate, with a free 30-day pilot. No setup fees, no hardware.',
  },
  {
    q: 'How long does it take to get started?',
    a: "Minutes. Complete a short intake, print one QR code, and place it where guests already look — the welcome packet, front desk, or activity board. There's no custom app to build or app-store submission to wait on.",
  },
]

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is RoadWave a replacement for App My Community?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'RoadWave is an alternative for campgrounds that want a simple, month-to-month guest amenity focused on helping guests connect with each other. App My Community is a fully custom-branded communications and operations app sold on annual contracts. Many parks choose RoadWave when they want connection and flexibility without a yearly commitment or a custom app build.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does RoadWave require an annual contract?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. RoadWave is month-to-month at a flat $39 per month and you can cancel anytime. App My Community offers annual contracts only.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do my guests need to download an app?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Guests scan a QR code and a web page opens instantly — there is nothing to install. They are checked in for 24 hours.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does RoadWave cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'RoadWave is a flat $39 per month per campground at the Founding Campground rate, with a free 30-day pilot. No setup fees and no hardware.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to get started?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Minutes. You complete a short intake, print one QR code, and place it where guests already look. There is no custom app to build or app-store submission to wait on.',
      },
    },
  ],
}

export default function AppMyCommunityAlternativePage() {
  return (
    <>
      {/* Header mirrors the /owners pattern: Logo + simple cross-nav. */}
      <header className="px-4 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-xl sm:text-2xl" />
        </Link>
        <nav>
          <ul className="flex items-center gap-3 sm:gap-6 text-sm">
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
                href="/owners/start"
                className="text-mist hover:text-cream transition-colors"
              >
                Start a Pilot
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>App My Community Alternative</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              A simpler, <span className="text-flame">month-to-month</span>{' '}
              guest app for your campground.
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              If you&rsquo;ve looked at App My Community and balked at the
              annual contract or the custom-app build, RoadWave is the
              lightweight alternative — a QR-code guest amenity that helps
              your campers connect, with no yearly commitment and a free
              pilot.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta"
              >
                Start My Free Pilot
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                See the 90-Second Demo
              </Link>
            </div>
            <p className="text-xs text-mist/80 leading-snug pt-1">
              Flat $39/month · Cancel anytime · No setup fees · No hardware
            </p>
          </div>
        </section>

        {/* Two good tools, built for different jobs. */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Two good tools, built for different jobs.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                App My Community and RoadWave both live on your
                guests&rsquo; phones — but they solve different problems.
                Here&rsquo;s the honest difference, so you can pick the
                right one.
              </p>
            </div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 space-y-4 text-mist text-base leading-relaxed">
              <p>
                <strong className="text-cream">App My Community</strong> is
                a fully custom-branded app that turns into your park&rsquo;s
                digital front desk — maps, event calendars, push
                notifications, firewood and pizza ordering, emergency
                alerts. It&rsquo;s a polished communications and operations
                hub, trusted by 300+ parks, and it&rsquo;s sold on annual
                contracts with a roughly two-week custom build to launch.
              </p>
              <p>
                <strong className="text-cream">RoadWave</strong> is narrower
                on purpose. It&rsquo;s a guest <em>connection</em>{' '}
                amenity: campers scan one QR code, set their privacy, and
                find the neighbors who share their interests — a wave only
                opens a hello when both people choose it. It&rsquo;s $39 a
                month, month-to-month, and live in minutes with nothing to
                build.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                RoadWave vs. App My Community
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                A side-by-side on the things campground owners ask about
                most.
              </p>
            </div>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-card">
              <table className="w-full text-sm sm:text-base">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-4 text-left">&nbsp;</th>
                    <th className="px-4 py-4 text-left text-[11px] sm:text-xs uppercase tracking-[0.16em] font-bold text-flame">
                      RoadWave
                    </th>
                    <th className="px-4 py-4 text-left text-[11px] sm:text-xs uppercase tracking-[0.16em] font-bold text-mist">
                      App My Community
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r) => (
                    <tr
                      key={r.feature}
                      className="border-b border-white/5 last:border-b-0"
                    >
                      <td className="px-4 py-4 align-top font-semibold text-mist w-[32%]">
                        {r.feature}
                      </td>
                      <td className="px-4 py-4 align-top font-semibold text-cream">
                        {r.rwCheck && (
                          <span
                            aria-hidden
                            className="mr-1.5 font-bold text-flame"
                          >
                            ✓
                          </span>
                        )}
                        {r.rw}
                      </td>
                      <td className="px-4 py-4 align-top text-mist">
                        {r.amcCheck && (
                          <span
                            aria-hidden
                            className="mr-1.5 font-bold text-mist"
                          >
                            ✓
                          </span>
                        )}
                        {r.amc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Why owners pick RoadWave instead. */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Why owners pick RoadWave instead.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {TILES.map((t) => (
                <article
                  key={t.title}
                  className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"
                >
                  <p className="text-2xl" aria-hidden>
                    {t.icon}
                  </p>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-cream leading-snug">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-mist leading-relaxed">
                    {t.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Fair-play: when AMC is the better choice. */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/10 border-l-4 border-l-flame bg-flame/[0.04] p-6 sm:p-7">
              <h3 className="font-display text-lg sm:text-xl font-extrabold text-cream leading-snug">
                When App My Community is the better choice — honestly.
              </h3>
              <p className="mt-3 text-base text-mist leading-relaxed">
                If what you want is a fully custom-branded app that handles
                maps, event calendars, in-app ordering, and acts as your
                park&rsquo;s all-in-one operations hub, App My Community is
                purpose-built for that and has the track record to back it
                up. RoadWave isn&rsquo;t trying to replace your operations
                software — it&rsquo;s the simple, flexible amenity for
                parks whose main goal is helping guests connect and come
                back. Plenty of owners run RoadWave precisely because they{' '}
                <em>don&rsquo;t</em> want a year-long contract or a build
                project.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ — native <details> matches the demo-center accordion pattern. */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Common questions
              </h2>
            </div>
            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-white/10 bg-card"
                >
                  <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-cream [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <span
                      aria-hidden
                      className="shrink-0 text-xl leading-none text-flame transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm sm:text-base text-mist leading-relaxed">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">
              See RoadWave with your campground name on it.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Free 30-day pilot. Month-to-month after that. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta"
              >
                Start My Free Pilot
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                Try the Demo <span aria-hidden>👋</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Page-specific trademark disclaimer (SiteFooter handles
            company info / legal nav / copyright). */}
        <div className="px-4 pt-8 pb-2">
          <p className="mx-auto max-w-2xl text-center text-xs text-mist/60 leading-relaxed">
            Comparison reflects publicly available information about App My
            Community as of May 2026. App My Community is a trademark of
            its respective owner; RoadWave is not affiliated with it.
          </p>
        </div>
      </main>

      {/* FAQPage structured data for rich results + AI answers. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
      />
    </>
  )
}

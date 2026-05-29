import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

// SEO product-positioning page: "Campground Guest App for RV Parks".
// Targets broader searches around "campground guest app", "RV park guest
// app", "campground communication app". Server component + native
// <details> FAQ (no client JS). Uses RoadWave components + design
// tokens. SiteFooter is appended by the root layout.

const CANONICAL = 'https://www.getroadwave.com/campground-guest-app'

export const metadata: Metadata = {
  title: 'Campground Guest App for RV Parks | RoadWave',
  description:
    'RoadWave is a campground guest app that helps RV parks share info, updates, office messages, reviews, rebooking links, and optional camper connections through one simple QR code.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Campground Guest App for RV Parks | RoadWave',
    description:
      'A campground guest app that helps RV parks share info, updates, office messages, reviews, rebooking, and optional camper connections through one QR code.',
    type: 'website',
    url: CANONICAL,
  },
  twitter: { card: 'summary_large_image' },
}

const SHOULD_DO: { icon: string; title: string; body: string }[] = [
  {
    icon: '🧭',
    title: 'Answer the basics, quickly',
    body: 'Wi-Fi, map, rules, amenities, check-in and check-out — the questions guests ask the office every day, answered before they need to ask.',
  },
  {
    icon: '📨',
    title: 'Let guests reach you without calling',
    body: 'A simple categorized office-messages form so a guest can ask about laundry, propane, quiet hours, or a maintenance issue without picking up the phone.',
  },
  {
    icon: '📌',
    title: 'Push timely updates',
    body: 'Bulletins for everyday news (coffee hours, food trucks, pool times) and pinned weather or safety notices when something needs attention right now.',
  },
  {
    icon: '⭐',
    title: 'Help good stays turn into reviews and rebookings',
    body: 'A direct path to your Google review listing and a Book Again link, presented at the moment a guest is most likely to act on them.',
  },
  {
    icon: '👋',
    title: 'Optionally help guests meet each other',
    body: 'Solo travelers, families, and weekenders who want to find their people can opt into Camper Connections — without a public chat or exact site numbers.',
  },
  {
    icon: '🔒',
    title: 'Respect privacy by default',
    body: 'Nothing posted publicly. Guests pick their visibility. Exact site numbers stay off the page. Connection is always opt-in on both sides.',
  },
]

const FRICTION_POINTS: { title: string; body: string }[] = [
  {
    title: 'Most guests will not install a new app for a short stay',
    body: 'A 2-night weekend RVer is not going to find, download, and create an account in your branded app. That gap between “great idea” and “guest actually uses it” is where most park apps quietly stop working.',
  },
  {
    title: 'QR access removes the install step entirely',
    body: 'A QR code on the welcome packet, front-desk card, or activity board opens a web page in the guest’s browser — no store, no install, no account required for the practical info. The friction is closer to scanning a Wi-Fi sticker than installing an app.',
  },
  {
    title: 'You don’t ship updates through an app store',
    body: 'Need to update your Wi-Fi password, post a weather notice, or fix a typo in your rules? You edit once and every guest sees the new version on their next scan or reload. No new build, no app-store review window.',
  },
]

const PRIVACY_POINTS: { icon: string; title: string; body: string }[] = [
  {
    icon: '🙈',
    title: 'No exact site numbers shown publicly',
    body: 'Camper Connections never displays a guest’s exact site number on a public card. Owners and the office don’t see private camper-to-camper messages either.',
  },
  {
    icon: '🗣️',
    title: 'No campground-wide public chat',
    body: 'There is no all-guests room that anyone can post to. We have seen what those become at campgrounds. Conversation lives behind mutual interest, not on a public wall.',
  },
  {
    icon: '🟢',
    title: 'Campers control their visibility',
    body: 'Each guest chooses Visible, Quiet, Invisible, or Campground Updates Only at check-in — and can change it at any time. Visibility is per-campground, not site-wide.',
  },
  {
    icon: '👋',
    title: 'Mutual Wave before deeper connection',
    body: 'A wave only opens a hello when both guests choose it. No one-way messages. No surprise inboxes. No “I waved at fifteen people and one of them was creepy.”',
  },
]

const SIMPLE_VS_BUILD: { title: string; body: string }[] = [
  {
    title: 'A guest amenity you turn on, not a custom build',
    body: 'RoadWave is not a custom-branded app that takes two weeks of design and an app-store submission before you can launch. It is a guest-facing welcome page you turn on, customize from the dashboard, and link with a QR code.',
  },
  {
    title: 'Month-to-month, no annual contract',
    body: 'Try it through a busy season. A flat $39 a month after a free 30-day pilot, and you can cancel any time from the owner billing tab. No “we need to true-up at renewal.”',
  },
  {
    title: 'Works alongside what you already use',
    body: 'Keep Campspot, Newbook, Bonfire, your spreadsheet, your phone — whatever runs your reservations and operations today. RoadWave is the layer that makes your campground feel modern after a guest pulls in.',
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is a campground guest app?',
    a: 'A campground guest app is the digital surface guests use during their stay to find practical park info (Wi-Fi, map, rules, amenities, hours), receive updates from the office, and increasingly to connect with other guests. Some are downloaded native apps; others, like RoadWave, are QR-loaded web experiences with no install required.',
  },
  {
    q: 'Does RoadWave require guests to install anything?',
    a: 'No. Guests scan a QR code with their phone camera and a web page opens instantly in their browser. There is nothing to install, no account is required for the practical guest info, and there is no app-store gate between the guest and your welcome page.',
  },
  {
    q: 'How is RoadWave different from a public campground chat?',
    a: 'There is no campground-wide public chat in RoadWave. There is no room any guest can post to. Camper-to-camper conversation only opens behind a mutual Wave (both campers choose to connect), and exact site numbers are never shown on a public card. The goal is a friendly amenity, not a campground bulletin board with arguments.',
  },
  {
    q: 'Can RoadWave help with reviews and rebooking?',
    a: 'Yes. Owners can show a one-tap link to their Google review listing and a Book Again button with their reservation URL on the guest-facing page. Both are designed to put the right ask in front of a guest at the right moment — RoadWave does not promise specific outcomes, but it makes it easier for happy guests to leave a review or come back.',
  },
  {
    q: 'Is RoadWave month-to-month?',
    a: 'Yes. RoadWave is a flat $39 per month after a free 30-day pilot and you can cancel any time from the owner billing tab. There is no annual contract and no setup fee.',
  },
]

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function CampgroundGuestAppPage() {
  return (
    <>
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
            <Eyebrow>Campground Guest App</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              A campground guest app{' '}
              <span className="text-flame">built for guests</span> — not
              against them.
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Most campground guest apps focus on park-to-guest broadcasts.
              RoadWave does the practical guest info that owners ask about
              most <em>and</em> adds optional, privacy-first camper
              connection — through one QR code, with no app to install.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta"
              >
                Start Free 30-Day Trial
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                Try the Demo
              </Link>
            </div>
            <p className="text-xs text-mist/80 leading-snug pt-1">
              Flat $39/month after the pilot · Cancel anytime · No setup
              fees · No hardware
            </p>
          </div>
        </section>

        {/* What a campground guest app should do */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-5xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                What a campground guest app should do.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                The honest checklist — what owners actually want a guest
                app to handle, and what guests actually want it to feel
                like.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SHOULD_DO.map((b) => (
                <article
                  key={b.title}
                  className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"
                >
                  <p className="text-2xl" aria-hidden>
                    {b.icon}
                  </p>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-cream leading-snug">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-mist leading-relaxed">
                    {b.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Why app downloads create friction */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Why app downloads create friction.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                The hardest part of any guest app is the second a guest
                has to install it. QR access changes the math.
              </p>
            </div>
            <div className="mt-8 space-y-4">
              {FRICTION_POINTS.map((r) => (
                <article
                  key={r.title}
                  className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"
                >
                  <h3 className="font-display text-lg font-extrabold text-cream leading-snug">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-base text-mist leading-relaxed">
                    {r.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy-first camper connection */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-5xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Privacy-first camper connection.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Optional connection is part of what makes RoadWave
                different from a one-way broadcast app — but it’s built so
                a guest never feels exposed.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {PRIVACY_POINTS.map((p) => (
                <article
                  key={p.title}
                  className="rounded-2xl border border-flame/30 bg-card p-5 sm:p-6"
                >
                  <p className="text-2xl" aria-hidden>
                    {p.icon}
                  </p>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-cream leading-snug">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-mist leading-relaxed">
                    {p.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Simple amenity, not a custom build */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                A simple amenity, not a complicated app build.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                You shouldn’t need a software project to give your guests a
                better welcome page.
              </p>
            </div>
            <div className="mt-8 space-y-4">
              {SIMPLE_VS_BUILD.map((r) => (
                <article
                  key={r.title}
                  className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"
                >
                  <h3 className="font-display text-lg font-extrabold text-cream leading-snug">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-base text-mist leading-relaxed">
                    {r.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
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

        {/* Related resources */}
        <section className="px-4 py-10 border-t border-white/5">
          <div className="mx-auto max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame text-center">
              Related RoadWave resources
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-mist text-center">
              <li>
                <Link
                  href="/qr-code-app-for-campgrounds"
                  className="hover:text-flame underline-offset-2 hover:underline"
                >
                  QR Code App for Campgrounds →
                </Link>
              </li>
              <li>
                <Link
                  href="/app-my-community-alternative"
                  className="hover:text-flame underline-offset-2 hover:underline"
                >
                  App My Community alternative →
                </Link>
              </li>
              <li>
                <Link
                  href="/owners"
                  className="hover:text-flame underline-offset-2 hover:underline"
                >
                  Why RoadWave for owners →
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="hover:text-flame underline-offset-2 hover:underline"
                >
                  Try the live demo →
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">
              A guest app guests will actually use.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Free 30-day pilot. Month-to-month after that. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta"
              >
                Start Free 30-Day Trial
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
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
      />
    </>
  )
}

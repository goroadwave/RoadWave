import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

// SEO product-positioning page: "QR Code App for Campgrounds".
// Targets owners searching for a QR-based guest information / digital
// welcome packet for their campground. Server component + native
// <details> FAQ (no client JS). Uses RoadWave components + design
// tokens. SiteFooter is appended by the root layout.

const CANONICAL = 'https://www.getroadwave.com/qr-code-app-for-campgrounds'

export const metadata: Metadata = {
  title: 'QR Code App for Campgrounds | RoadWave',
  description:
    'RoadWave gives campgrounds one guest QR code for Wi-Fi, maps, rules, updates, office messages, reviews, rebooking, and optional camper connections — no app download required.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'QR Code App for Campgrounds | RoadWave',
    description:
      'One guest QR code for Wi-Fi, maps, rules, updates, office messages, reviews, rebooking, and optional camper connections. No app download.',
    type: 'website',
    url: CANONICAL,
  },
  twitter: { card: 'summary_large_image' },
}

const GUEST_SEES: { icon: string; title: string; body: string }[] = [
  {
    icon: '📶',
    title: 'Wi-Fi info',
    body: 'Network name and password — tap to copy. Fewer trips to the front desk to ask.',
  },
  {
    icon: '🗺️',
    title: 'Campground map',
    body: 'Your park map opens with one tap so guests can find their site, the laundry, the dog park.',
  },
  {
    icon: '📋',
    title: 'Rules & amenities',
    body: 'Quiet hours, dump-station hours, pet rules, pool times — answered without a phone call.',
  },
  {
    icon: '📌',
    title: 'Campground bulletins',
    body: 'Post a bulletin once — every checked-in guest sees the latest park update.',
  },
  {
    icon: '💬',
    title: 'Office messages',
    body: 'Guests send categorized requests (Wi-Fi, Laundry, Maintenance, Quiet hours) right to the office inbox.',
  },
  {
    icon: '⛈️',
    title: 'Weather & safety notices',
    body: 'Pin a critical notice when there’s severe weather or a campground-wide safety message.',
  },
  {
    icon: '⭐',
    title: 'Leave a review',
    body: 'A one-tap link points happy guests at your Google review listing on checkout day.',
  },
  {
    icon: '🛎️',
    title: 'Rebook or return',
    body: 'A Book Again button with your reservation link — turn a great stay into a return visit.',
  },
  {
    icon: '👋',
    title: 'Optional camper connections',
    body: 'Guests who want to meet other campers can join private, opt-in Camper Connections.',
  },
]

const OWNER_BENEFITS: { icon: string; title: string; body: string }[] = [
  {
    icon: '⚡',
    title: 'Fewer repetitive front-desk questions',
    body: 'Wi-Fi, map, rules, and hours are answered before guests pick up the phone — designed to free up your team for the requests that actually need them.',
  },
  {
    icon: '😊',
    title: 'Better guest experience',
    body: 'Guests get the practical answers they need in one scan, and a friendly place to find updates, meetups, and people who share their interests.',
  },
  {
    icon: '📈',
    title: 'More review + rebooking opportunities',
    body: 'A direct path to your Google review listing and a Book Again button puts the right ask in front of the right guest at the right moment.',
  },
  {
    icon: '📨',
    title: 'Easier communication',
    body: 'Bulletins, meetups, weather notices, and office messages live in one place so guests are not chasing info across email, signs, and social.',
  },
  {
    icon: '📱',
    title: 'No app-store download barrier',
    body: 'Guests scan and the page opens instantly in their browser — nothing to install, nothing to set up.',
  },
  {
    icon: '🚀',
    title: 'Fast setup, free pilot',
    body: 'A short intake, one QR code to print, and you are live. Try it through a busy season with a free 30-day pilot and month-to-month after.',
  },
]

const WHY_QR: { title: string; body: string }[] = [
  {
    title: 'No app store, no install friction',
    body: 'A QR scan opens a page in the guest’s default browser. They don’t need to find your app, accept permissions, create an account, or update anything. The 30-second friction of an install is the difference between a guest using your tool and not.',
  },
  {
    title: 'Works on any phone',
    body: 'iPhone, Android, old phones, new phones — if the camera reads a QR code, the page loads. No native build to maintain, no operating-system minimums to worry about.',
  },
  {
    title: 'You update once, every guest sees it',
    body: 'Change a Wi-Fi password, post a weather notice, edit your hours — guests see the new version on their next scan or reload. No app update, no app-store review window.',
  },
  {
    title: 'It feels like an amenity, not a chore',
    body: 'Owners tell us the QR sticker on the welcome packet or office door works the same way the Wi-Fi sticker did ten years ago: it’s helpful, it’s expected, and guests appreciate that it just works.',
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do guests need to download an app?',
    a: 'No. Guests scan a QR code with their phone camera and a web page opens instantly in their browser. There is nothing to install and no account required for the practical guest information.',
  },
  {
    q: 'What can be included on the campground QR page?',
    a: 'Wi-Fi network and password, the park map, rules and amenities, check-in / check-out details, campground bulletins, meetups, weather and safety notices, an office-messages form, a review link, a Book Again link, and (optionally) Camper Connections. Each block can be turned on or off from your owner dashboard.',
  },
  {
    q: 'Can RoadWave show Wi-Fi, map, and campground rules?',
    a: 'Yes. Those are the three blocks most parks turn on first. Wi-Fi has a tap-to-copy network and password, the map links to your existing map image or URL, and rules render as plain text you can edit any time from the dashboard.',
  },
  {
    q: 'Can guests contact the office through RoadWave?',
    a: 'Yes. The Office Messages form lets a guest pick a category (Wi-Fi, Laundry, Maintenance, Propane, Quiet hours, and more) and send a short note. It lands in your owner inbox with optional email alerts, so you can reply when it makes sense for your team.',
  },
  {
    q: 'Is Camper Connections required?',
    a: 'No. Camper Connections is optional and off by default if you’d rather not surface it. Guests who do opt in choose their visibility (Visible, Quiet, Invisible, or Campground Updates Only) and can change it any time.',
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

export default function QrCodeAppForCampgroundsPage() {
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
            <Eyebrow>QR Code App for Campgrounds</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              One QR code.{' '}
              <span className="text-flame">Everything your guests need.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              RoadWave is a QR-powered guest amenity for campgrounds and RV
              parks. Guests scan one code and get Wi-Fi, your map, rules,
              bulletins, office messages, reviews, rebooking, and optional
              camper connections — without downloading an app.
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
                See the Demo
              </Link>
            </div>
            <p className="text-xs text-mist/80 leading-snug pt-1">
              Flat $39/month after the pilot · Cancel anytime · No setup
              fees · No hardware
            </p>
          </div>
        </section>

        {/* What guests see when they scan */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-5xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                What guests see when they scan.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                A single, fast-loading welcome page with everything a guest
                usually walks back to the office for. Each block is
                optional and editable from your owner dashboard.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GUEST_SEES.map((b) => (
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

        {/* What it does for your team / owner benefits */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                What it does for your team.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                The honest list: what owners running RoadWave at their park
                tell us actually changed for them.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OWNER_BENEFITS.map((b) => (
                <article
                  key={b.title}
                  className="rounded-2xl border border-flame/30 bg-card p-5 sm:p-6"
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

        {/* Why a QR works better than a downloaded app */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <div className="text-center space-y-3">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Why a QR works better than a downloaded app.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                A weekend RVer is not going to download a new app for two
                nights — and that’s fine. The QR meets guests where they
                already are.
              </p>
            </div>
            <div className="mt-8 space-y-4">
              {WHY_QR.map((r) => (
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
                  href="/campground-guest-app"
                  className="hover:text-flame underline-offset-2 hover:underline"
                >
                  Campground Guest App guide →
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
                  See the live demo →
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">
              Print one QR code. Light up your campground.
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
                See the Demo <span aria-hidden>👋</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FAQPage structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }}
      />
    </>
  )
}

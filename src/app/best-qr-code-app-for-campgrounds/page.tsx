import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { buildBreadcrumbList, buildFAQPage } from '@/lib/seo/schema'

// Cornerstone SEO page for owners searching variations of "best QR code app
// for campgrounds". Mirrors the existing Phase 2 SEO page shape (Logo +
// cross-nav header, hero, themed sections, FAQ, related-resources block,
// final CTA, SiteFooter via root layout). Schema: FAQPage + BreadcrumbList.

const CANONICAL = 'https://www.getroadwave.com/best-qr-code-app-for-campgrounds'

export const metadata: Metadata = {
  title:
    'Best QR Code App for Campgrounds: Wi-Fi, Maps, Updates, Office Messages & Camper Connections | RoadWave',
  description:
    'A practical guide to QR-powered guest hubs for campgrounds and RV parks — Wi-Fi, maps, rules, bulletins, office messages, reviews, rebooking, and optional camper connections. No app download required.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Best QR Code App for Campgrounds | RoadWave',
    description:
      'A QR-powered guest hub for campgrounds and RV parks. One scan opens Wi-Fi, maps, rules, bulletins, office messages, reviews, rebooking, and optional camper connections — no app download required.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best QR Code App for Campgrounds | RoadWave',
    description:
      'A QR-powered guest hub for campgrounds and RV parks. One scan, no app download required.',
  },
}

const FAQS = [
  {
    q: 'What is a QR code app for campgrounds?',
    a: 'It is a one-scan guest hub. The owner prints a QR code, places it where guests already look (the welcome packet, front desk card, or activity board), and a guest scans it to open a web page with Wi-Fi info, the park map, rules, the latest bulletins, office messages, review and rebooking links, and — if the park enables it — optional camper connections. Nothing to install.',
  },
  {
    q: 'Why pick a QR guest hub over a custom mobile app?',
    a: 'A QR guest hub is live in minutes, requires no app-store submission, no annual contract, and no install on the guest side. A custom mobile app gives you full branding and push notifications but takes weeks to build, requires guests to download it, and is usually sold on a yearly contract. Many parks use the QR hub because it removes friction on the guest side — scan, done.',
  },
  {
    q: 'What do guests actually see when they scan the code?',
    a: 'A clean, mobile-first welcome page with the campground name, current bulletins, weather-safety notices, office contact, the on-site map, Wi-Fi credentials, and the menu of optional camper connections. No login is required to view campground info — the login only kicks in if the guest wants to wave at neighbors or post a meetup.',
  },
  {
    q: 'Do campers have to download an app to use RoadWave?',
    a: 'For campground info — Wi-Fi, maps, rules, updates, office messages — no. The QR code opens a web page that works on any modern phone. Optional camper-to-camper features (Waves, meetups, profile) do ask the camper to create a quick account, because those features depend on identity and consent on both sides.',
  },
  {
    q: 'Is RoadWave the same as a campground messaging board?',
    a: 'No. RoadWave is not a public campground-wide chat. The owner publishes bulletins one-to-many, the office can reply to a specific guest privately, and the optional camper connections are mutual — both campers have to opt in before any conversation opens. It is designed to encourage real-life interaction, not replace it.',
  },
  {
    q: 'How much does RoadWave cost?',
    a: 'There is a free 30-day pilot. After the pilot, Founding Campground plans start at $39/month, month-to-month, with no setup fees and no hardware. Cancel anytime.',
  },
  {
    q: 'How long does setup take?',
    a: 'Minutes. Complete a short intake, get your campground page provisioned, then print one QR code and place it where guests already look. No app-store wait, no custom build.',
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  {
    name: 'Best QR Code App for Campgrounds',
    path: '/best-qr-code-app-for-campgrounds',
  },
])

export default function BestQRCodeAppPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-xl sm:text-2xl" />
        </Link>
        <nav>
          <ul className="flex items-center gap-3 sm:gap-6 text-sm">
            <li>
              <Link href="/owners" className="text-mist hover:text-cream transition-colors">
                Why RoadWave?
              </Link>
            </li>
            <li>
              <Link href="/demo" className="text-mist hover:text-cream transition-colors">
                Demo
              </Link>
            </li>
            <li>
              <Link href="/owners/start" className="text-mist hover:text-cream transition-colors">
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
            <Eyebrow>For Campground Owners</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              The best QR code app for campgrounds{' '}
              <span className="text-flame">isn&rsquo;t an app at all.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              RoadWave is a QR-powered guest hub for campgrounds and RV parks.
              Guests scan one code to access Wi-Fi, maps, rules, bulletins,
              office messages, reviews, rebooking, and optional privacy-first
              camper connections — no app download required.
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
                Try the Demo <span aria-hidden>👋</span>
              </Link>
            </div>
            <p className="text-xs text-mist/80 leading-snug pt-1">
              Free 30-day pilot · Month-to-month after · No annual contract
            </p>
          </div>
        </section>

        {/* Short, plain-English answer block */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              What a QR guest hub actually does
            </h2>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 space-y-4 text-mist text-base leading-relaxed">
              <p>
                You print <strong className="text-cream">one QR code</strong>{' '}
                and place it on the welcome packet, the front-desk card, or
                an activity-board sign. When a camper scans it, a
                mobile-first web page opens instantly — no app store, no
                install, no waiting on a download over slow campground Wi-Fi.
              </p>
              <p>
                That page is your campground&rsquo;s public hub. It carries
                the practical info every guest asks for in their first hour
                on site, plus the things you publish during their stay
                (rule reminders, weather-safety notices, meetup posts,
                last-minute office messages). If you want, it can also open
                up an optional, privacy-first way for campers to find each
                other.
              </p>
            </div>
          </div>
        </section>

        {/* What's on the QR page */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              What lives behind the QR code
            </h2>
            <p className="mt-3 text-mist text-base sm:text-lg leading-relaxed text-center max-w-2xl mx-auto">
              Eight categories that cover the questions guests ask owners
              every day.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                {
                  t: 'Wi-Fi credentials',
                  d: 'The network name and password right on the welcome screen, so the front desk stops repeating it every check-in.',
                },
                {
                  t: 'On-site map',
                  d: 'The park map you already have, embedded so guests can pinch to zoom on their own phone instead of unfolding paper.',
                },
                {
                  t: 'Rules and quiet hours',
                  d: 'The same rules sheet that goes in the welcome packet, plain-text and searchable on the phone they already have in their hand.',
                },
                {
                  t: 'Bulletins and updates',
                  d: 'You post once from the owner dashboard — pool closure, ranger talk tonight, store hours change — and every checked-in camper sees it the next time they open the hub.',
                },
                {
                  t: 'Weather-safety notices',
                  d: 'A short, clearly-labeled notice (tornado watch, severe thunderstorm) when the area is under watch. This is weather safety information, not 911 dispatch.',
                },
                {
                  t: 'Office messages',
                  d: 'One-to-one between the guest and the front desk: package arrival, site change, late-arrival code. Private to the conversation, not a public chat.',
                },
                {
                  t: 'Review and rebooking links',
                  d: 'A polite end-of-stay nudge to leave a Google review and a one-tap link to book the same site again next year.',
                },
                {
                  t: 'Optional camper connections',
                  d: 'For campers who want it: a privacy-first way to find neighbors who share their interests. Mutual Waves only — no exact site numbers shown, low-pressure.',
                },
              ].map((it) => (
                <li
                  key={it.t}
                  className="rounded-2xl border border-white/10 bg-card p-5 text-mist text-sm leading-relaxed"
                >
                  <p className="font-semibold text-cream mb-1.5">{it.t}</p>
                  <p>{it.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Why QR beats download-an-app */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-6 text-mist text-base sm:text-lg leading-relaxed">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              Why QR-first beats download-an-app for most parks
            </h2>
            <p>
              An app on every guest&rsquo;s phone sounds great until you
              think about who actually camps with you. Half of your guests
              are road-tripping retirees on iOS, the other half are
              families on Android, a few are international travelers on a
              data plan that doesn&rsquo;t want to spend roaming bytes on a
              50 MB download — and all of them want answers <em>now</em>,
              not after a five-minute App Store dance.
            </p>
            <p>
              A QR guest hub side-steps that entirely. The same scan works
              on any phone, no install required, the page loads in under a
              second, and the guest is reading your bulletins before they
              would have finished typing your park&rsquo;s name into the
              store search. The QR sticker itself becomes the only piece of
              physical infrastructure you need.
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-leaf/30 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
                Who a QR guest hub is best for
              </h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>
                  Independent campgrounds and RV parks that want a polished
                  guest amenity without a custom-app build.
                </li>
                <li>
                  Owners who&rsquo;ve looked at annual contracts and
                  decided month-to-month is a better fit.
                </li>
                <li>
                  Parks where the front desk repeats the same five
                  questions a hundred times a week (Wi-Fi, maps, store
                  hours, quiet hours, pool times).
                </li>
                <li>
                  Owners who want a soft way to encourage real-life camper
                  connections without running a public chat board.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
                Who it&rsquo;s not for
              </h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>
                  Parks that want a fully branded, custom-built mobile app
                  in the App Store and Google Play.
                </li>
                <li>
                  Operations that need integrated firewood/store ordering,
                  push notifications to the OS, or a deep reservation-system
                  rebuild.
                </li>
                <li>
                  Parks that need 24/7 emergency-dispatch software —
                  RoadWave is not a 911 replacement and weather notices are
                  informational, not emergency response.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              Common questions
            </h2>
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
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame text-center">
              Related RoadWave resources
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-mist text-center">
              <li>
                <Link href="/campground-guest-app-without-download" className="hover:text-flame underline-offset-2 hover:underline">
                  Campground guest app without an app download →
                </Link>
              </li>
              <li>
                <Link href="/campground-digital-welcome-packet" className="hover:text-flame underline-offset-2 hover:underline">
                  Digital welcome packet for campgrounds →
                </Link>
              </li>
              <li>
                <Link href="/campground-guest-communication-software" className="hover:text-flame underline-offset-2 hover:underline">
                  Campground guest communication software →
                </Link>
              </li>
              <li>
                <Link href="/campground-app-vs-qr-guest-hub" className="hover:text-flame underline-offset-2 hover:underline">
                  Campground app vs QR guest hub →
                </Link>
              </li>
            </ul>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }}
      />
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { buildBreadcrumbList, buildFAQPage } from '@/lib/seo/schema'

const CANONICAL =
  'https://www.getroadwave.com/campground-guest-app-without-download'

export const metadata: Metadata = {
  title: 'Campground Guest App Without an App Download | RoadWave',
  description:
    'A practical look at how a QR-powered guest hub gives RV park guests Wi-Fi, maps, rules, bulletins, office messages, and optional camper connections — without making them download an app.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Campground Guest App Without an App Download | RoadWave',
    description:
      'A QR-powered guest hub for campgrounds and RV parks. One scan, no install. Camper info needs no download; optional camper connections still ask for a quick account.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campground Guest App Without an App Download | RoadWave',
    description:
      'A QR-powered campground guest hub. No app download required for campground info.',
  },
}

const FAQS = [
  {
    q: 'Why avoid an app download for guests?',
    a: 'Three real reasons. Campground Wi-Fi is often slow, so a 30–50 MB download is a frustrating first impression. Half your guests are on iOS and half on Android, so a single app store listing only solves half the problem. And every download requires the guest to commit to a brand-new app for what might be a three-night stay. A QR-scanned web page side-steps all three.',
  },
  {
    q: 'Is RoadWave really 100% no-download?',
    a: 'For campground info — Wi-Fi, maps, rules, bulletins, weather-safety notices, office messages — yes. The guest scans the QR and a web page opens. Optional camper-to-camper features (Waves, meetups, a public profile) ask the guest to create a quick account, because those features depend on identity and consent on both sides. The campground hub itself never requires an install.',
  },
  {
    q: 'Does it work on any phone?',
    a: 'Yes — any modern smartphone with a browser. iOS Safari, Android Chrome, Samsung Internet, Firefox Mobile. The QR is just a URL; the camera or QR-scanner app opens it like any other link.',
  },
  {
    q: "What if a guest doesn't want to scan a QR code at all?",
    a: 'Two fallbacks. The same web URL is printed under the QR on the welcome packet and the front-desk card, so a guest who prefers typing can enter it directly. And the front desk can still answer all the same questions in person — the QR hub is an add-on, not a replacement.',
  },
  {
    q: 'How does the owner publish updates to the hub?',
    a: 'From the owner dashboard. The owner posts bulletins (pool closure, ranger talk at 7pm, store-hours change), and every camper who is checked in sees it the next time they open the hub. No push notifications to install or grant permission for.',
  },
  {
    q: 'Does the front desk still get to message a specific guest?',
    a: 'Yes — office messages are one-to-one. The owner can reach a specific checked-in guest (package arrival, site change, late-arrival code) without the conversation being visible to anyone else. It is not a public campground-wide chat.',
  },
  {
    q: 'How much does it cost?',
    a: 'Free 30-day pilot. After that, Founding Campground plans start at $39/month, month-to-month, no setup fees and no hardware. Cancel anytime.',
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  {
    name: 'Campground Guest App Without an App Download',
    path: '/campground-guest-app-without-download',
  },
])

export default function NoDownloadPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="inline-block shrink-0"><Logo className="text-xl sm:text-2xl" /></Link>
        <nav>
          <ul className="flex items-center gap-3 sm:gap-6 text-sm">
            <li><Link href="/owners" className="text-mist hover:text-cream transition-colors">Why RoadWave?</Link></li>
            <li><Link href="/demo" className="text-mist hover:text-cream transition-colors">Demo</Link></li>
            <li><Link href="/owners/start" className="text-mist hover:text-cream transition-colors">Start a Pilot</Link></li>
          </ul>
        </nav>
      </header>

      <main>
        <section className="px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>For Campground Owners</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              A campground guest app{' '}
              <span className="text-flame">without an app download.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              RoadWave is a QR-powered guest hub for campgrounds and RV
              parks. Guests scan one code and a mobile-first web page
              opens — Wi-Fi, maps, rules, bulletins, office messages,
              reviews, rebooking, and optional privacy-first camper
              connections. No app store, no install, no waiting on slow
              campground Wi-Fi to finish downloading 30 MB before they can
              find their site.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Start Free 30-Day Trial</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">Try the Demo <span aria-hidden>👋</span></Link>
            </div>
            <p className="text-xs text-mist/80 leading-snug pt-1">Free 30-day pilot · Month-to-month · No annual contract</p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              The download problem
            </h2>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 space-y-4 text-mist text-base leading-relaxed">
              <p>
                A guest pulls in on a Friday afternoon. They want the
                Wi-Fi password, the map, and a sense of how the place
                works. You hand them a welcome packet that says &ldquo;Download
                our app for full info.&rdquo;
              </p>
              <p>
                Half of them do it. The other half stare at the App Store
                screen, hit cancel, and walk over to ask the front desk
                what the Wi-Fi password is. The guest who <em>did</em>{' '}
                download the app spent five minutes on it before they
                could even read your rules.
              </p>
              <p>
                A QR-powered guest hub fixes the friction. The same
                information lives behind a single scan, opens in under a
                second on any phone, and works the same on iOS, Android,
                and even on an in-laws&rsquo; older device that hasn&rsquo;t been
                updated in three years.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              What never requires a download
            </h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                'Wi-Fi network name and password',
                'On-site map (pinch-to-zoom on the guest’s phone)',
                'Park rules and quiet hours',
                'Today’s bulletins and updates',
                'Weather-safety notices for the area',
                'Office contact and store hours',
                'Review and rebooking links at the end of the stay',
              ].map((line) => (
                <li key={line} className="rounded-xl border border-white/10 bg-card px-5 py-4 text-mist text-sm sm:text-base">
                  <span className="text-flame mr-2" aria-hidden>•</span>{line}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-mist text-sm leading-relaxed text-center max-w-2xl mx-auto">
              The whole campground hub works inside the browser. The QR is
              the only piece of physical infrastructure you need to
              install.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-5 text-mist text-base sm:text-lg leading-relaxed">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              What does ask for a quick account
            </h2>
            <p>
              The optional camper-to-camper features — finding nearby
              campers with shared interests, sending a Wave that opens a
              hello only when the other camper waves back, posting a
              meetup at the firepit — are account-based on purpose.
              That&rsquo;s where consent and identity matter, and
              account-gating is how RoadWave keeps those features
              privacy-first.
            </p>
            <p>
              A camper who doesn&rsquo;t want any of that just uses the QR
              hub for the campground info and never sees the account
              prompt. The two halves of the product are deliberately
              decoupled.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-leaf/30 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who this is best for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks that want a polished guest amenity without a custom-app build.</li>
                <li>Owners tired of repeating the Wi-Fi password 80 times a week.</li>
                <li>Parks where guests are roadtripping and don&rsquo;t want to install yet another app.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who it&rsquo;s not for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks that specifically want a custom-branded App Store/Google Play listing.</li>
                <li>Operations needing deep reservation-system rebuilds or in-app firewood ordering.</li>
                <li>Parks expecting a 911/emergency-dispatch product — RoadWave is not that.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">Common questions</h2>
            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-white/10 bg-card">
                  <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-cream [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span><span aria-hidden className="shrink-0 text-xl leading-none text-flame transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <div className="px-5 pb-5 text-sm sm:text-base text-mist leading-relaxed">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame text-center">Related RoadWave resources</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm text-mist text-center">
              <li><Link href="/best-qr-code-app-for-campgrounds" className="hover:text-flame underline-offset-2 hover:underline">Best QR code app for campgrounds →</Link></li>
              <li><Link href="/campground-app-vs-qr-guest-hub" className="hover:text-flame underline-offset-2 hover:underline">Campground app vs QR guest hub →</Link></li>
              <li><Link href="/campground-digital-welcome-packet" className="hover:text-flame underline-offset-2 hover:underline">Digital welcome packet →</Link></li>
              <li><Link href="/campground-guest-communication-software" className="hover:text-flame underline-offset-2 hover:underline">Guest communication software →</Link></li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">Skip the download. Print a QR.</h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">Free 30-day pilot. Month-to-month after that. Cancel anytime.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Start Free 30-Day Trial</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">Try the Demo <span aria-hidden>👋</span></Link>
            </div>
          </div>
        </section>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
    </>
  )
}

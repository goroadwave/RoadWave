import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { buildBreadcrumbList, buildFAQPage } from '@/lib/seo/schema'

const CANONICAL =
  'https://www.getroadwave.com/campground-guest-communication-software'

export const metadata: Metadata = {
  title: 'Campground Guest Communication Software for RV Parks | RoadWave',
  description:
    'How a QR-powered guest hub gives RV parks and campgrounds office messages, bulletins, weather-safety notices, meetups, and guest updates — without making guests download an app.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Campground Guest Communication Software | RoadWave',
    description:
      'Office messages, bulletins, weather notices, meetups, guest updates. One QR scan, no app download required.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campground Guest Communication Software | RoadWave',
    description:
      'Bulletins, office messages, weather notices, and meetups for campgrounds and RV parks.',
  },
}

const FAQS = [
  {
    q: 'What does "campground guest communication software" mean?',
    a: 'Software that helps a campground or RV park owner talk to current guests — not their email subscribers and not the general public. Bulletins for everyone on site, one-to-one office messages with a specific guest, weather-safety notices when the area is under a watch, and optional posts about activities or meetups.',
  },
  {
    q: 'Is it a chat room for everyone in the park?',
    a: 'No. RoadWave is deliberately not a public campground-wide chat. The owner posts bulletins one-to-many (every checked-in camper sees them). The office can reply to a specific guest privately. The optional camper-to-camper features are mutual — both campers have to opt in before any conversation opens.',
  },
  {
    q: 'How do bulletins work?',
    a: 'The owner writes a short message in the dashboard ("pool closed until 3pm", "ranger talk in the amphitheatre at 7pm tonight", "store hours change on Sunday") and every checked-in camper sees it the next time they open the campground hub. Plain text, simple, no formatting fights.',
  },
  {
    q: 'What about weather notices?',
    a: 'There is a separate, clearly-labeled weather-safety notice surface. The owner posts it when the area is under a watch (severe thunderstorm, tornado watch). It is informational — pulled from public weather feeds and announced by the owner — not a 911 dispatch service. Local emergency services are still the right call in an emergency.',
  },
  {
    q: 'Can campers reply to bulletins?',
    a: 'Not on the bulletin itself. Bulletins are one-to-many announcements, not a thread. If a camper needs something specific (package question, site change), the office-messages surface gives them a private channel to the front desk.',
  },
  {
    q: 'Is the front desk going to get flooded with messages?',
    a: 'In practice, no. Most campers use the QR hub for info (Wi-Fi, map, rules) and never message anyone. The ones who do reach out tend to have a real question — and answering on the phone is often faster than answering in person at the desk.',
  },
  {
    q: 'How is this different from a Facebook group?',
    a: 'Three differences. RoadWave is private to your park and your current guests — not public to the internet. Bulletins are owner-controlled rather than open-post. And it is operationally simpler: no friend graph, no algorithm, no comment moderation.',
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  {
    name: 'Guest Communication Software',
    path: '/campground-guest-communication-software',
  },
])

export default function GuestCommunicationSoftwarePage() {
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
              Guest communication software{' '}
              <span className="text-flame">your campers actually read.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              RoadWave is a QR-powered guest hub for campgrounds and RV
              parks. Owners use it for bulletins, office messages,
              weather-safety notices, meetups, and guest updates — all
              behind one QR code that guests scan to access without
              downloading an app.
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
              Four kinds of campground communication
            </h2>
            <p className="mt-4 text-mist text-base sm:text-lg leading-relaxed text-center max-w-2xl mx-auto">
              Different conversations need different surfaces. RoadWave
              keeps them separate so each one stays useful.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  t: 'Bulletins (owner → everyone)',
                  d: 'Pool maintenance today. Ranger talk at 7pm. Store hours change Sunday. Owner posts once, every checked-in camper sees it. Not a thread, not a discussion — just the announcement.',
                },
                {
                  t: 'Office messages (one-to-one)',
                  d: 'Package arrival, site change, late-arrival code. Private between the front desk and a specific guest. Faster than catching them at the desk; quieter than calling.',
                },
                {
                  t: 'Weather-safety notices',
                  d: 'A clearly-labeled section the owner uses when the area is under a watch. Informational only — pulled from public weather feeds, not a 911 dispatch.',
                },
                {
                  t: 'Meetups (campers → campers, optional)',
                  d: 'A camper posts "bonfire at site 14, 8pm, marshmallows provided". Other campers see it on their hub. Owner-moderated; campers opt in.',
                },
              ].map((it) => (
                <div key={it.t} className="rounded-2xl border border-white/10 bg-card p-5 text-mist text-sm leading-relaxed">
                  <p className="font-semibold text-cream mb-1.5">{it.t}</p>
                  <p>{it.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl space-y-5 text-mist text-base sm:text-lg leading-relaxed">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              What it isn&rsquo;t
            </h2>
            <p>
              RoadWave is not a public campground-wide chat. There is no
              open thread, no comment section under bulletins, no
              algorithm picking what to surface. Owners we&rsquo;ve talked
              to who tried Facebook groups or open chat boards burned out
              on moderation — RoadWave is structured to avoid that
              outcome.
            </p>
            <p>
              It is also not 911 software. Weather-safety notices are
              informational. If something serious is happening on site,
              the camp host, local police, and emergency services are
              still the right channels.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-leaf/30 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who this is best for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks where the front desk repeats the same updates every day.</li>
                <li>Owners who want one place to publish announcements without taping notes everywhere.</li>
                <li>Parks that want guest connection without the moderation burden of a public chat.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who it&rsquo;s not for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks wanting a full public campground-wide chat board.</li>
                <li>Operations needing OS-level push notifications.</li>
                <li>Parks expecting emergency-dispatch / 911 features.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
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
              <li><Link href="/campground-digital-welcome-packet" className="hover:text-flame underline-offset-2 hover:underline">Digital welcome packet →</Link></li>
              <li><Link href="/roadwave-vs-facebook-groups-for-campgrounds" className="hover:text-flame underline-offset-2 hover:underline">RoadWave vs Facebook Groups →</Link></li>
              <li><Link href="/campground-camper-connections" className="hover:text-flame underline-offset-2 hover:underline">Campers connecting safely →</Link></li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">Talk to your guests without the chaos.</h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">Free 30-day pilot. Month-to-month. Cancel anytime.</p>
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

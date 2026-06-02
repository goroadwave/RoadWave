import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { buildBreadcrumbList, buildFAQPage } from '@/lib/seo/schema'

const CANONICAL =
  'https://www.getroadwave.com/campground-digital-welcome-packet'

export const metadata: Metadata = {
  title:
    'Campground Digital Welcome Packet for RV Parks and Campgrounds | RoadWave',
  description:
    'How a QR-powered digital welcome packet replaces (or complements) printed handouts at RV parks and campgrounds — Wi-Fi, maps, rules, bulletins, and updates in one scan.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Campground Digital Welcome Packet | RoadWave',
    description:
      'A QR-powered digital welcome packet for campgrounds and RV parks. Wi-Fi, maps, rules, bulletins, and office messages — no app download required.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campground Digital Welcome Packet | RoadWave',
    description:
      'Wi-Fi, map, rules, bulletins, and office messages in one QR scan.',
  },
}

const FAQS = [
  {
    q: 'What is a digital welcome packet for a campground?',
    a: 'A web page behind one QR code that carries everything the printed welcome packet used to carry — Wi-Fi credentials, the on-site map, park rules, store hours, store and amenity info, important phone numbers, and any updates the owner wants to publish during the stay. Guests scan and get it on their phone immediately.',
  },
  {
    q: 'Does the digital packet replace the printed packet?',
    a: 'It can, but most parks use both — keep a short printed card with the QR code at the front desk for guests who prefer paper, and let the digital packet carry the longer content (full rules, the latest pool-hours change, a tornado watch the moment NWS issues one). The printed sheet becomes a one-pager pointing at the QR.',
  },
  {
    q: 'Can owners update the packet during a stay?',
    a: 'Yes. The owner dashboard publishes bulletins and updates that show up in the welcome packet the next time a checked-in guest opens it. Pool closure today, ranger talk at 7pm tonight, store hours changing on Sunday — all editable in seconds without reprinting anything.',
  },
  {
    q: 'What about weather and safety information?',
    a: 'Weather-safety notices are a separate, clearly-labeled section. They are informational — pulled from public weather feeds and posted by the owner — not a 911 dispatch service. The packet does not replace local emergency services.',
  },
  {
    q: 'Does it need a login?',
    a: 'No login is required to view the campground welcome packet. Only the optional camper-to-camper features (Waves, meetups, posting a profile) ask the camper to create a quick account, because those features rely on identity and consent on both sides.',
  },
  {
    q: "Can the welcome packet include the campground's branding?",
    a: 'Yes — the page shows your campground name, logo, and the bulletins/info you publish. RoadWave is the platform; the surface that guests see is your campground hub.',
  },
  {
    q: 'How much does RoadWave cost?',
    a: 'Free 30-day pilot. After that, Founding Campground plans start at $39/month, month-to-month, with no setup fees and no hardware. Cancel anytime.',
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  {
    name: 'Digital Welcome Packet',
    path: '/campground-digital-welcome-packet',
  },
])

export default function DigitalWelcomePacketPage() {
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
              A digital welcome packet{' '}
              <span className="text-flame">that updates itself.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              RoadWave turns the welcome packet into a QR-powered guest
              hub for campgrounds and RV parks. Guests scan one code to
              access Wi-Fi, maps, rules, bulletins, office messages,
              reviews, rebooking, and optional privacy-first camper
              connections — no app download required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Start Free 30-Day Trial</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">Try the Demo <span aria-hidden>👋</span></Link>
            </div>
            <p className="text-xs text-mist/80 leading-snug pt-1">Free 30-day pilot · No annual contract · Cancel anytime</p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              The trouble with paper
            </h2>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 space-y-4 text-mist text-base leading-relaxed">
              <p>
                The printed welcome packet is the right idea: meet the
                guest where they are at check-in, hand them everything
                they need to know. But by Saturday afternoon, half the
                packet is already out of date — pool closed for
                maintenance, the bulk-firewood delivery delayed,
                tomorrow&rsquo;s ranger talk moved to the amphitheatre.
              </p>
              <p>
                Reprinting in real time isn&rsquo;t practical. So most
                parks end up with paper that&rsquo;s right at check-in and
                a bunch of taped-up signs and front-desk explanations for
                everything that changed since. A digital welcome packet
                solves that: one URL, edited from the dashboard, current
                the moment a guest reloads it.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              What goes in the digital packet
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { t: 'Wi-Fi name + password', d: 'Right at the top, no digging.' },
                { t: 'On-site map', d: 'The map you already have, embedded and zoomable on the guest’s phone.' },
                { t: 'Park rules + quiet hours', d: 'Plain-text, searchable, same content as the printed sheet.' },
                { t: 'Office contact + store hours', d: 'Click-to-call phone number, store hours, anything you’d normally tell a guest at check-in.' },
                { t: 'Live bulletins', d: 'You post once from the dashboard, every checked-in guest sees it.' },
                { t: 'Weather-safety notices', d: 'A clearly-labeled informational notice when the area is under watch.' },
                { t: 'Reviews and rebooking', d: 'A polite end-of-stay nudge, plus a one-tap link to book next year.' },
                { t: 'Optional camper connections', d: 'A privacy-first way for campers who want it to find neighbors with shared interests.' },
              ].map((it) => (
                <li key={it.t} className="rounded-2xl border border-white/10 bg-card p-5 text-mist text-sm leading-relaxed">
                  <p className="font-semibold text-cream mb-1.5">{it.t}</p>
                  <p>{it.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-5 text-mist text-base sm:text-lg leading-relaxed">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              How owners use it day-to-day
            </h2>
            <p>
              Most parks keep a short printed card at the front desk —
              just the campground name, the QR, and the URL printed
              underneath for guests who prefer typing. The card itself
              never changes. The content behind the QR is what gets
              updated.
            </p>
            <p>
              Owners we&rsquo;ve worked with use the bulletin tool for
              the same kinds of updates they used to tape to the office
              door: pool maintenance, ranger talk reminders, store-hours
              changes, sudden weather notices, package-pickup reminders.
              The dashboard takes about 15 seconds per bulletin and the
              update propagates to every checked-in camper.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-leaf/30 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who this is best for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks that already have a welcome packet but want it to stay current.</li>
                <li>Owners tired of taping notes to the office door.</li>
                <li>Parks adding seasonal events or facilities that need real-time updates.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who it&rsquo;s not for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks that want zero digital surface — RoadWave is web-based.</li>
                <li>Parks looking for a full reservation/PMS replacement.</li>
                <li>Parks that need 24/7 staffed emergency dispatch (RoadWave is informational, not 911).</li>
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
              <li><Link href="/campground-guest-app-without-download" className="hover:text-flame underline-offset-2 hover:underline">Guest app without a download →</Link></li>
              <li><Link href="/campground-guest-communication-software" className="hover:text-flame underline-offset-2 hover:underline">Guest communication software →</Link></li>
              <li><Link href="/campground-app-vs-qr-guest-hub" className="hover:text-flame underline-offset-2 hover:underline">Campground app vs QR guest hub →</Link></li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">Make the welcome packet pull its weight.</h2>
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

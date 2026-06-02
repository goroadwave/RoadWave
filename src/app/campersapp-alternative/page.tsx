import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { buildBreadcrumbList, buildFAQPage } from '@/lib/seo/schema'

const CANONICAL = 'https://www.getroadwave.com/campersapp-alternative'

export const metadata: Metadata = {
  title: 'CampersAPP Alternative for RV Parks and Campgrounds | RoadWave',
  description:
    "A fair comparison page for campground owners weighing CampersAPP versus RoadWave. RoadWave is a QR-powered guest hub with no app download required for campground info, owner-controlled bulletins, and optional privacy-first camper connections.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'CampersAPP Alternative for RV Parks and Campgrounds | RoadWave',
    description:
      'A QR-powered guest hub for campgrounds and RV parks. No app download required for camper info; optional privacy-first camper connections still require login.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CampersAPP Alternative for RV Parks | RoadWave',
    description:
      'A QR-powered guest hub for campgrounds. Month-to-month, free pilot.',
  },
}

const FAQS = [
  {
    q: 'How is RoadWave different from CampersAPP?',
    a: "Both help campgrounds talk to guests, but the shape is different. CampersAPP is a downloadable app product. RoadWave is a QR-powered web hub — guests scan a code to read campground info on any phone, no install required. The optional camper-connection features live behind a quick account; campground info doesn't.",
  },
  {
    q: 'Why pick a QR-first hub over an app-first product?',
    a: 'No App Store/Google Play step for guests, no waiting on slow campground Wi-Fi to finish a download, and the same scan works on iOS, Android, and older devices. The QR sticker is the only piece of physical infrastructure to install.',
  },
  {
    q: 'Do my guests need to download anything for RoadWave?',
    a: 'For campground info — Wi-Fi, maps, rules, bulletins, weather notices, office messages — no. The QR opens a web page that works on any modern phone. Optional camper-to-camper features (Waves, meetups, a public profile) ask for a quick account because identity and consent matter there.',
  },
  {
    q: 'Can owners publish updates during a stay?',
    a: "Yes. From the owner dashboard you publish bulletins (pool closure, ranger talk, store-hours change) and every checked-in camper sees it the next time they open the hub. Office messages are private one-to-one with a specific guest. There's no public campground-wide chat.",
  },
  {
    q: 'What about reviews and rebooking?',
    a: 'The end-of-stay surface includes a polite nudge to leave a Google review and a one-tap link to rebook the same site next year. Both are optional from the guest side.',
  },
  {
    q: "What's the pricing model?",
    a: 'RoadWave is month-to-month with a free 30-day pilot. After the pilot, Founding Campground plans start at $39/month. No setup fees, no hardware, cancel anytime.',
  },
  {
    q: 'How long does it take to set up?',
    a: 'Minutes. Short intake, your campground page is provisioned, then print one QR code and place it where guests already look (welcome packet, front desk, activity board).',
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  { name: 'CampersAPP Alternative', path: '/campersapp-alternative' },
])

export default function CampersAppAlternativePage() {
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
            <Eyebrow>CampersAPP Alternative</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              A QR-first alternative to{' '}
              <span className="text-flame">downloadable campground apps.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              If you&rsquo;ve looked at CampersAPP and want a similar
              guest-communication tool without making your campers
              install something, RoadWave is the lightweight alternative.
              It&rsquo;s a QR-powered guest hub for campgrounds and RV
              parks — Wi-Fi, maps, rules, bulletins, office messages,
              reviews, rebooking, and optional privacy-first camper
              connections, all behind one scan.
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
              Two honest tools, slightly different jobs
            </h2>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 space-y-4 text-mist text-base leading-relaxed">
              <p>
                <strong className="text-cream">CampersAPP</strong> is a
                guest-communication product that lives on the guest&rsquo;s
                phone as a downloadable app. The owner publishes content
                from a dashboard; the guest downloads the app to receive
                it.
              </p>
              <p>
                <strong className="text-cream">RoadWave</strong> takes the
                same job and reshapes it around a QR code. The guest scans
                instead of downloading. The campground hub — Wi-Fi, maps,
                rules, bulletins, office messages, weather notices —
                works in any browser with no install. The optional
                camper-to-camper features (Waves, meetups) live behind a
                quick account because identity and consent matter for
                those.
              </p>
              <p>
                Both tools work. The QR approach trades one piece of
                guest-side friction (install) for a slightly different
                shape on the owner side (you&rsquo;re publishing to a web
                hub, not a native app). Pick whichever matches how your
                guests behave.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              What RoadWave gives owners
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { t: 'One QR, one hub', d: 'Wi-Fi, maps, rules, bulletins, office messages — all in one scan.' },
                { t: 'Owner-published bulletins', d: 'Post once from the dashboard; every checked-in camper sees it.' },
                { t: 'Private office messages', d: 'One-to-one with a specific guest. Not a public chat.' },
                { t: 'Weather-safety notices', d: 'Clearly labeled, informational, owner-published. Not 911.' },
                { t: 'Reviews and rebooking', d: 'Polite end-of-stay prompts: Google review + book next year, one tap each.' },
                { t: 'Optional camper connections', d: 'Privacy-first: mutual Waves, no exact site numbers, visibility controls, opt-in.' },
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
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-leaf/30 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who RoadWave is best for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks whose guests are reluctant to install a new app.</li>
                <li>Owners who want month-to-month flexibility instead of a yearly commitment.</li>
                <li>Parks looking for a soft path to camper-to-camper connection without running a public chat.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who it&rsquo;s not for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks that specifically want a custom-branded App Store/Google Play listing.</li>
                <li>Parks needing OS-level push notifications.</li>
                <li>Parks expecting emergency-dispatch/911 features.</li>
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
              <li><Link href="/app-my-community-alternative" className="hover:text-flame underline-offset-2 hover:underline">App My Community alternative →</Link></li>
              <li><Link href="/best-qr-code-app-for-campgrounds" className="hover:text-flame underline-offset-2 hover:underline">Best QR code app for campgrounds →</Link></li>
              <li><Link href="/campground-app-vs-qr-guest-hub" className="hover:text-flame underline-offset-2 hover:underline">Campground app vs QR guest hub →</Link></li>
              <li><Link href="/campground-guest-app-without-download" className="hover:text-flame underline-offset-2 hover:underline">Guest app without a download →</Link></li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">See it on your campground&rsquo;s page.</h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">Free 30-day pilot. Month-to-month. Cancel anytime.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Start Free 30-Day Trial</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">Try the Demo <span aria-hidden>👋</span></Link>
            </div>
          </div>
        </section>

        <div className="px-4 pt-8 pb-2">
          <p className="mx-auto max-w-2xl text-center text-xs text-mist/60 leading-relaxed">
            Comparison reflects publicly available information about
            CampersAPP as of June 2026. CampersAPP is a trademark of its
            respective owner; RoadWave is not affiliated with it.
          </p>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
    </>
  )
}

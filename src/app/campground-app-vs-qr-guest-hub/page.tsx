import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import {
  buildArticle,
  buildBreadcrumbList,
  buildFAQPage,
} from '@/lib/seo/schema'

const CANONICAL =
  'https://www.getroadwave.com/campground-app-vs-qr-guest-hub'

export const metadata: Metadata = {
  title: 'Campground App vs QR Guest Hub: Which Is Better? | RoadWave',
  description:
    'When a full custom-branded mobile app makes sense at a campground or RV park, and when a QR-powered guest hub is the simpler, faster, no-install alternative. An owner-focused guide.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Campground App vs QR Guest Hub | RoadWave',
    description:
      'When a custom-branded mobile app makes sense for a campground, and when a QR guest hub is the simpler choice.',
    url: CANONICAL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campground App vs QR Guest Hub | RoadWave',
    description:
      'When a full mobile app is the right call, and when a QR guest hub wins.',
  },
}

const FAQS = [
  {
    q: 'Is a mobile app always better than a QR guest hub?',
    a: 'No. A native app gives push notifications, App Store visibility, and a custom-branded icon — real benefits for big parks with long stays and committed return guests. But it asks every guest to download something, which most won\'t do for a three-night stay. A QR guest hub trades push for zero-install reach.',
  },
  {
    q: 'When does a custom-branded mobile app make sense?',
    a: 'Large parks with multi-week or seasonal stays, parks running paid events that benefit from push reminders, parks deeply integrated with reservation systems that want a single owned app surface, and parks willing to commit to an annual build budget.',
  },
  {
    q: 'When is a QR-powered guest hub the better fit?',
    a: 'Most independent campgrounds and RV parks. Anywhere guests are road-tripping and unlikely to install yet another app. Anywhere the owner wants a polished guest amenity without a custom-app build or annual contract.',
  },
  {
    q: 'Can a QR hub replace push notifications?',
    a: 'Not exactly. Push fires on the OS lock screen; a QR hub only updates when a guest opens the page. In practice, owners post bulletins to the hub and rely on the camper checking the hub when they need info — Wi-Fi, today\'s rules, the office message they were expecting. For one-off urgent comms, the front desk and on-site signage still play a role.',
  },
  {
    q: 'Do guests need a login for a QR hub?',
    a: 'For campground info, no — they scan and read. For optional camper-to-camper features (Waves, meetups, a public profile) RoadWave does ask for a quick account, because identity and consent matter for those features.',
  },
  {
    q: 'Can a park run both a mobile app AND a QR hub?',
    a: 'Yes. Some parks layer them — the app for power-users and seasonal guests, the QR for everyone else and short stays. RoadWave doesn\'t conflict with an existing app; it sits in the welcome packet next to it.',
  },
  {
    q: 'How is RoadWave priced compared to a custom mobile app?',
    a: 'RoadWave is month-to-month with a free 30-day pilot; Founding Campground plans start at $39/month with no setup fees and no hardware. Custom mobile apps are typically annual contracts and often include a build fee.',
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  {
    name: 'Campground App vs QR Guest Hub',
    path: '/campground-app-vs-qr-guest-hub',
  },
])
const ARTICLE_LD = buildArticle({
  headline: 'Campground App vs QR Guest Hub: Which Is Better?',
  description:
    'When a custom-branded mobile app makes sense at a campground, and when a QR-powered guest hub is the simpler, faster, no-install alternative.',
  canonicalPath: '/campground-app-vs-qr-guest-hub',
  datePublished: '2026-06-02',
})

export default function AppVsQrHubPage() {
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
            <Eyebrow>Owner&rsquo;s Guide</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Campground app vs QR guest hub:{' '}
              <span className="text-flame">which is better?</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Both can work. The right choice depends on your guests, your
              stay length, and how much friction you can absorb on the
              install side. Here&rsquo;s a plain-English breakdown — no
              marketing fluff — to help you decide.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Try the QR Hub Free</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">See the Demo <span aria-hidden>👋</span></Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-5 text-mist text-base sm:text-lg leading-relaxed">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              The honest tradeoff
            </h2>
            <p>
              A custom-branded mobile app is a great experience{' '}
              <em>for the guest who installs it.</em> The trouble is that
              most guests don&rsquo;t. Short stays, slow campground Wi-Fi,
              and App Store fatigue mean a 30–50 MB download is a real
              ask. For the guests who do install, you get push
              notifications, a branded icon on their home screen, and
              deeper integrations.
            </p>
            <p>
              A QR-powered guest hub flips the math. Every guest gets
              campground info on their first scan — no install, no
              app-store dance, no waiting on Wi-Fi. The tradeoff is no
              OS-level push notifications, and the app icon is just a
              browser tab.
            </p>
            <p>
              For most independent parks, the QR hub wins on
              guest-side reach. For very large parks with multi-week
              stays and a committed return audience, a mobile app can
              earn back its install friction.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              Side-by-side
            </h2>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-card">
              <table className="w-full text-sm sm:text-base">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-4 text-left">&nbsp;</th>
                    <th className="px-4 py-4 text-left text-[11px] sm:text-xs uppercase tracking-[0.16em] font-bold text-flame">QR guest hub</th>
                    <th className="px-4 py-4 text-left text-[11px] sm:text-xs uppercase tracking-[0.16em] font-bold text-mist">Custom mobile app</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Guest install step', 'None (web)', 'App Store / Google Play download'],
                    ['Works on first scan', 'Yes', 'After install'],
                    ['Time to launch', 'Minutes', '2–8 weeks (custom build)'],
                    ['Pricing model', 'Month-to-month', 'Often annual'],
                    ['Push notifications', 'No', 'Yes'],
                    ['Branded App Store listing', 'No', 'Yes'],
                    ['Updates by owner', 'Live, dashboard', 'Live, dashboard'],
                    ['Wi-Fi / maps / rules', 'Yes', 'Yes'],
                    ['Office messages', 'Yes', 'Yes'],
                    ['Camper-to-camper connection', 'Optional, privacy-first', 'Varies'],
                  ].map(([feat, a, b]) => (
                    <tr key={feat} className="border-b border-white/5 last:border-b-0">
                      <td className="px-4 py-3 font-semibold text-cream">{feat}</td>
                      <td className="px-4 py-3 text-mist">{a}</td>
                      <td className="px-4 py-3 text-mist">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-leaf/30 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">QR hub is best when</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Most stays are short (1–7 nights).</li>
                <li>Guest mix is mixed iOS/Android with no installed loyalty.</li>
                <li>You want to launch this season, not next.</li>
                <li>Month-to-month flexibility matters more than push.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">A custom mobile app is best when</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Most guests are seasonal or multi-week.</li>
                <li>Push notifications are operationally critical.</li>
                <li>You want a custom-branded App Store/Google Play listing.</li>
                <li>You have budget and timeline for a custom build.</li>
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
              <li><Link href="/campground-guest-app-without-download" className="hover:text-flame underline-offset-2 hover:underline">Guest app without a download →</Link></li>
              <li><Link href="/app-my-community-alternative" className="hover:text-flame underline-offset-2 hover:underline">App My Community alternative →</Link></li>
              <li><Link href="/campersapp-alternative" className="hover:text-flame underline-offset-2 hover:underline">CampersAPP alternative →</Link></li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">Pick the lighter path first.</h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">Free 30-day pilot of the QR guest hub. Cancel anytime.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Start Free 30-Day Trial</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">Try the Demo <span aria-hidden>👋</span></Link>
            </div>
          </div>
        </section>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />
    </>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { buildBreadcrumbList, buildFAQPage } from '@/lib/seo/schema'

const CANONICAL =
  'https://www.getroadwave.com/roadwave-vs-facebook-groups-for-campgrounds'

export const metadata: Metadata = {
  title: 'RoadWave vs Facebook Groups for Campgrounds | RoadWave',
  description:
    'When a Facebook group is a fine tool for a campground community, and when a private, campground-controlled QR-powered guest hub is the better fit. A fair comparison for owners.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'RoadWave vs Facebook Groups for Campgrounds | RoadWave',
    description:
      'When a Facebook group makes sense for your park, and when a private, owner-controlled QR guest hub is the better choice.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RoadWave vs Facebook Groups for Campgrounds',
    description:
      'When a Facebook group works for a campground, and when a private QR guest hub is the better fit.',
  },
}

const FAQS = [
  {
    q: "Aren't Facebook groups already free? Why pay for RoadWave?",
    a: 'Facebook groups are free and useful for off-season community and pre-arrival questions. They are less useful for on-site, current-stay guest communication: the audience is mixed (past guests, future guests, public), the owner doesn\'t fully control the surface, and there\'s no clean way to push a "today only" bulletin to people currently checked in. RoadWave is the on-site, current-guest surface; a Facebook group can sit alongside it for the broader community.',
  },
  {
    q: 'Who controls the content?',
    a: 'In a Facebook group, members post and Meta\'s algorithm picks what surfaces. In RoadWave, the owner publishes bulletins and the camper sees them; office messages are private one-to-one. Owners we\'ve talked to who tried open Facebook groups burned out on moderation — the owner-controlled model is a deliberate response to that.',
  },
  {
    q: 'Are guest messages private in RoadWave?',
    a: 'Yes. Office messages are one-to-one between the owner and a specific guest. Camper-to-camper conversations are between the two campers (after a mutual Wave) and are not visible to the owner or to other campers. Facebook group messages are mostly public to group members.',
  },
  {
    q: "What about reaching people who aren't checked in yet?",
    a: 'Facebook is genuinely good for that — engagement, reviews, photos, pre-trip planning. RoadWave is for guests on site right now. If a park already runs a Facebook page or group, RoadWave doesn\'t conflict; the two cover different parts of the guest journey.',
  },
  {
    q: 'Does a Facebook group help with Wi-Fi, maps, and rules at check-in?',
    a: "Indirectly. A pinned post can carry rules, but guests tend not to read pinned posts in time. RoadWave's QR-based welcome surface gets in front of the guest the moment they arrive on site, with the practical info they need in their first hour.",
  },
  {
    q: 'What about camper-to-camper connection?',
    a: "A Facebook group can do that, but only for campers who are already in the group, find each other in feed, and reveal site information publicly. RoadWave's Camper Connections are scoped to the current campground only, mutual Waves only, with no exact site numbers shown and per-camper visibility controls.",
  },
  {
    q: 'Can RoadWave and a Facebook group be used together?',
    a: 'Yes, and many parks do. Use Facebook for the off-season community, reviews, photos, and pre-trip planning. Use RoadWave for the on-site, current-stay surface. They complement each other.',
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  {
    name: 'RoadWave vs Facebook Groups',
    path: '/roadwave-vs-facebook-groups-for-campgrounds',
  },
])

export default function RoadwaveVsFacebookGroupsPage() {
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
            <Eyebrow>RoadWave vs Facebook Groups</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Facebook groups are great.{' '}
              <span className="text-flame">For a different job.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              A Facebook group can be a useful park-community space — off-season chatter,
              photos, reviews, pre-trip questions. It&rsquo;s less useful as the
              on-site, current-stay communication surface that owners actually
              need. RoadWave is built for that on-site surface: private to your
              park, controlled by you, and no app download required for guests
              to read it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Start Free 30-Day Trial</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">Try the Demo <span aria-hidden>👋</span></Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              Different jobs, different surfaces
            </h2>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 space-y-4 text-mist text-base leading-relaxed">
              <p>
                <strong className="text-cream">A Facebook group</strong> is
                a public-ish space for community. Members post photos
                and questions, the algorithm decides what surfaces, and
                the audience is mixed: past guests, future guests, locals,
                and curious onlookers.
              </p>
              <p>
                <strong className="text-cream">RoadWave</strong> is the
                opposite of public-ish. It&rsquo;s private to your
                campground, scoped to whoever is currently checked in, and
                fully owner-controlled. Bulletins go from you to your
                campers; office messages are one-to-one with a specific
                guest; optional camper-to-camper messages happen only
                after a mutual Wave.
              </p>
              <p>
                Most parks benefit from both — the Facebook page for
                community and discovery, RoadWave for the on-site
                experience and current-guest comms.
              </p>
            </div>
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
                    <th className="px-4 py-4 text-left text-[11px] sm:text-xs uppercase tracking-[0.16em] font-bold text-flame">RoadWave</th>
                    <th className="px-4 py-4 text-left text-[11px] sm:text-xs uppercase tracking-[0.16em] font-bold text-mist">Facebook group</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Audience scope', 'Current on-site guests', 'Mixed (past, future, public)'],
                    ['Content control', 'Owner-published bulletins', 'Members + algorithm'],
                    ['Office ↔ guest messages', 'Private one-to-one', 'Mostly public or DM'],
                    ['Wi-Fi / maps / rules at check-in', 'On the QR welcome surface', 'Pinned post (often unread)'],
                    ['Camper-to-camper privacy', 'Mutual Waves, no site numbers shown', 'Public posts, member-visible'],
                    ['Owner moderation burden', 'Low (no open threads)', 'High (open posting)'],
                    ['Guest install step', 'None (QR scan)', 'Already has Facebook installed'],
                    ['Owner cost', 'From $39/month', 'Free'],
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
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">When RoadWave is the better fit</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>You need a current-stay surface: Wi-Fi, today&rsquo;s bulletins, office messages.</li>
                <li>You want owner control rather than open-post moderation.</li>
                <li>You want camper-to-camper connection without making site numbers public.</li>
                <li>You want a guest surface that works without anyone installing anything.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">When a Facebook group is the better fit</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Off-season community, photos, reviews, pre-trip planning.</li>
                <li>Audience that already lives on Facebook.</li>
                <li>You actively want open posting and member-driven discussion.</li>
                <li>Budget is zero and the on-site surface isn&rsquo;t a priority.</li>
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
              <li><Link href="/campground-guest-communication-software" className="hover:text-flame underline-offset-2 hover:underline">Guest communication software →</Link></li>
              <li><Link href="/campground-camper-connections" className="hover:text-flame underline-offset-2 hover:underline">Help campers connect safely →</Link></li>
              <li><Link href="/best-qr-code-app-for-campgrounds" className="hover:text-flame underline-offset-2 hover:underline">Best QR code app for campgrounds →</Link></li>
              <li><Link href="/campground-digital-welcome-packet" className="hover:text-flame underline-offset-2 hover:underline">Digital welcome packet →</Link></li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">Keep the Facebook group. Add the on-site surface.</h2>
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
            Facebook groups as of June 2026. Facebook is a trademark of
            Meta Platforms, Inc.; RoadWave is not affiliated with Meta.
          </p>
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
    </>
  )
}

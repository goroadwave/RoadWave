import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { buildBreadcrumbList, buildFAQPage } from '@/lib/seo/schema'

const CANONICAL = 'https://www.getroadwave.com/campground-camper-connections'

export const metadata: Metadata = {
  title: 'Help Campers Connect Safely at Your Campground | RoadWave',
  description:
    "RoadWave's optional Camper Connections — mutual Waves, no exact site numbers, visibility controls, and low-pressure matching. Designed to encourage real-life interaction without exposing campers' locations.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Help Campers Connect Safely at Your Campground | RoadWave',
    description:
      'Privacy-first camper connections: mutual Waves, no exact site numbers, visibility controls. Optional and opt-in.',
    url: CANONICAL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Campers Connect Safely at Your Campground',
    description:
      'Mutual Waves. No exact site numbers. Visibility controls. Opt-in.',
  },
}

const FAQS = [
  {
    q: 'How do Camper Connections actually work?',
    a: 'A camper sets their interests and a visibility level (visible, quiet, or invisible). They can see other campers nearby who share interests and have chosen to be visible. To open a conversation, both campers have to wave at each other — a mutual Wave. One-sided waves never become a chat.',
  },
  {
    q: 'Are site numbers ever shown publicly?',
    a: "No. RoadWave never displays a camper's exact site number on the public hub. Approximate nearness is shown (\"in this campground right now\") but not the parking-pad ID. Owners and the camper themselves see the site; other campers don't.",
  },
  {
    q: 'Is this opt-in?',
    a: 'Yes. Camper Connections are entirely optional. A camper can use the QR hub purely for campground info (Wi-Fi, map, rules, bulletins) without ever creating an account or appearing in any list. Account creation only kicks in when the camper actively wants to engage with neighbors.',
  },
  {
    q: 'What if a camper changes their mind partway through a stay?',
    a: "Visibility is adjustable any time. A camper can switch to Quiet (hidden from the list, can still wave first) or Invisible (off entirely) and the change takes effect immediately. The original check-in doesn't lock them into any visibility level.",
  },
  {
    q: 'Does this encourage real-life meetings or replace them?',
    a: 'Encourage them. Two campers who Wave can exchange a short hello and then meet at the firepit. The Wave is a low-pressure way to break the ice — it is not a chat replacement for spending time together. Owners we talk to like that it nudges guests toward the activities the park already runs.',
  },
  {
    q: 'What does the owner see?',
    a: "Owners see a high-level summary of camper-connection activity (how many campers opted into visibility, how many Waves were sent) without seeing individual messages between campers. Camper conversations stay between the campers — they're not part of the owner dashboard.",
  },
  {
    q: 'What about safety? What if a camper feels uncomfortable?',
    a: 'A camper can block another camper instantly; the block is immediate and silent on the other side. There is also a report flow that surfaces to the RoadWave trust and safety queue. See the Trust & Safety Protocol page for the full procedure.',
  },
  {
    q: 'Is this a dating app?',
    a: "No. RoadWave is a campground guest hub. Camper Connections are about shared-interest neighbors — sports, music, hiking, dogs, kids the same age — not romantic matching. The framing, the copy, and the visibility model are all designed around that.",
  },
]

const FAQ_LD = buildFAQPage(FAQS)
const BREADCRUMB_LD = buildBreadcrumbList([
  { name: 'RoadWave', path: '/' },
  { name: 'For Campground Owners', path: '/owners' },
  {
    name: 'Camper Connections',
    path: '/campground-camper-connections',
  },
])

export default function CamperConnectionsPage() {
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
              Help campers connect{' '}
              <span className="text-flame">safely.</span>
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              RoadWave includes an optional, privacy-first way for
              campers to find each other at your campground. Mutual Waves
              only, no exact site numbers, visibility controls, and an
              opt-in model. It&rsquo;s designed to encourage real-life
              interaction, not replace it — and not every camper has to
              use it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link href="/owners/start" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold trial-cta">Start Free 30-Day Trial</Link>
              <Link href="/demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors">Try the Demo <span aria-hidden>👋</span></Link>
            </div>
            <p className="text-xs text-mist/80 leading-snug pt-1">Optional. Opt-in. Privacy-first by design.</p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              How a Wave works
            </h2>
            <div className="mt-8 rounded-2xl border border-white/10 bg-card p-6 sm:p-8 space-y-4 text-mist text-base leading-relaxed">
              <p>
                Two campers in the same park see each other in the
                nearby list (only campers who chose to be visible appear
                there). One sends the other a Wave — a single,
                no-pressure gesture, the digital equivalent of catching
                someone&rsquo;s eye across the campfire circle.
              </p>
              <p>
                If the other camper Waves back, a short conversation
                opens. If they don&rsquo;t, the original Wave just sits
                in the &ldquo;past Waves&rdquo; column and life goes on —
                no one has to explain anything.
              </p>
              <p>
                The Wave is meant to be the smallest possible doorway.
                Once two campers say hello, the rest is meant to happen
                at the firepit, the dog park, or the camp store —
                not on a screen.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream text-center">
              The privacy promises
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { t: 'No exact site numbers shown publicly', d: 'Other campers see "in this campground right now" — not your parking pad.' },
                { t: 'Visibility is the camper’s choice', d: 'Visible, Quiet, or Invisible — adjustable any time, no questions.' },
                { t: 'Waves are mutual', d: 'Both campers wave before any chat opens. A one-sided Wave never becomes a conversation.' },
                { t: 'Block is instant + silent', d: 'A blocked camper isn’t notified. The block takes effect immediately on both sides.' },
                { t: 'No public campground-wide chat', d: 'Bulletins are owner-published. There is no open thread for everyone to post in.' },
                { t: 'Owners see summary, not messages', d: 'The owner dashboard shows how many campers opted in. Camper messages stay between campers.' },
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
              What this isn&rsquo;t
            </h2>
            <p>
              Camper Connections is not a dating app. The framing, the
              copy, and the visibility model are all built around
              shared-interest neighbors — sports, music, hiking, dogs,
              kids the same age. The Wave is a low-pressure hello, not a
              match.
            </p>
            <p>
              It&rsquo;s also not emergency software. If someone is in
              real danger or behaving threateningly, 911 and the camp
              host are the right channels. RoadWave&rsquo;s trust and
              safety queue handles reports of platform-side misuse;
              it&rsquo;s not a substitute for emergency response.
            </p>
          </div>
        </section>

        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-leaf/30 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who this is best for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks where guests already strike up conversations at the firepit.</li>
                <li>Owners who want to nudge community without running a public chat.</li>
                <li>Family parks where kids and parents look for &ldquo;neighbors who camp like we do&rdquo;.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-3">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">Who it&rsquo;s not for</h2>
              <ul className="space-y-2 text-mist text-sm sm:text-base leading-relaxed">
                <li>Parks looking for a dating-style matching product.</li>
                <li>Owners who want an open public chat where any camper can post anything.</li>
                <li>Parks expecting 24/7 emergency-response staffing — RoadWave is not that.</li>
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
              <li><Link href="/safety-protocol" className="hover:text-flame underline-offset-2 hover:underline">Trust &amp; Safety Protocol →</Link></li>
              <li><Link href="/safety" className="hover:text-flame underline-offset-2 hover:underline">Safety on RoadWave →</Link></li>
              <li><Link href="/roadwave-vs-facebook-groups-for-campgrounds" className="hover:text-flame underline-offset-2 hover:underline">RoadWave vs Facebook Groups →</Link></li>
              <li><Link href="/best-qr-code-app-for-campgrounds" className="hover:text-flame underline-offset-2 hover:underline">Best QR code app for campgrounds →</Link></li>
            </ul>
          </div>
        </section>

        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">Connection, without the chaos.</h2>
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

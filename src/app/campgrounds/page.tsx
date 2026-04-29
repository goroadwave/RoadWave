import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { CampgroundLeadForm } from '@/components/campgrounds/lead-form'
import { CampgroundRileyButton } from '@/components/campgrounds/riley-campground-button'

export const metadata: Metadata = {
  title: 'RoadWave for Campgrounds — Give your guests a reason to come back',
  description:
    'A private QR-code amenity that helps your guests connect — without messy Facebook groups, group chats, or site-number sharing.',
}

export default function CampgroundsPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          For RVers ←
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <Eyebrow>For campground owners</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Give your guests a reason to come back.
            </h1>
            <p className="font-serif italic text-flame text-xl sm:text-2xl leading-snug">
              A simple QR-code amenity that helps guests meet each other safely.
            </p>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              RoadWave is a private QR-code amenity. Your guests scan it,
              find their people across your sites, and leave with friends
              they want to see again next year.
            </p>
            <div className="pt-2">
              <a
                href="#request-demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Get a Branded Demo Page for My Campground
              </a>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Your guests want connection. The tools they have are awful.
            </h2>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Facebook groups. Site-number swaps. Awkward small talk at the bathhouse.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 pt-6 text-left">
              {[
                {
                  emoji: '😬',
                  title: 'Facebook groups are messy',
                  body: 'Public posts, drama, ads. Half your guests refuse to join.',
                },
                {
                  emoji: '📍',
                  title: 'Sharing site numbers feels off',
                  body: "Nobody wants to give a stranger a literal address to find them.",
                },
                {
                  emoji: '🤐',
                  title: 'Group chats blow up',
                  body: 'Notifications all night. Nobody actually meets anybody.',
                },
              ].map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-white/5 bg-card p-5"
                >
                  <p className="text-3xl mb-2" aria-hidden>
                    {p.emoji}
                  </p>
                  <h3 className="font-semibold text-cream mb-1">{p.title}</h3>
                  <p className="text-sm text-mist leading-snug">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <Eyebrow>The fix</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              A private QR-code amenity. That&apos;s it.
            </h2>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              No app store. No public posts. No site numbers. Just a wave across the campground.
            </p>
            <p className="text-mist max-w-xl mx-auto leading-relaxed">
              You print one QR code per campground. Your guests scan it from
              the welcome sign. They&apos;re in for 24 hours. They wave at the
              folks they&apos;d like to meet. If both wave, they connect. If
              not, no one knows.
            </p>
          </div>
        </section>

        {/* How it works — 4 steps */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Four taps from check-in to campfire.
              </h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  emoji: '📷',
                  title: 'Scan the QR',
                  body: 'Guests scan from your welcome sign. They are in for 24 hours.',
                },
                {
                  emoji: '👁',
                  title: 'Set visibility',
                  body: 'Visible, Quiet, or Invisible. Per-field sharing toggles.',
                },
                {
                  emoji: '👀',
                  title: 'See who is around',
                  body: 'Other check-ins surface — filtered by interests and travel style.',
                },
                {
                  emoji: '👋',
                  title: 'Wave & meet',
                  body: 'Mutual wave unlocks a private hello — no public messages, no group chat. Quiet means no one sees the miss.',
                },
              ].map((s, i) => (
                <li
                  key={s.title}
                  className="rounded-2xl border border-white/5 bg-card p-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-lg bg-flame text-night font-display text-base font-extrabold"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="text-2xl" aria-hidden>
                      {s.emoji}
                    </span>
                  </div>
                  <h3 className="font-semibold text-cream mb-1">{s.title}</h3>
                  <p className="text-sm text-mist leading-snug">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Privacy */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>Privacy promise</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              No site numbers. No public posts. No open group chat.
            </h2>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Total opt-in. Wave-back required before any private hello opens.
            </p>
            <ul className="text-left grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto pt-4">
              {[
                'Nothing posted publicly. Ever.',
                "Site numbers are not shared in the app.",
                "A wave is private until both sides wave back.",
                "Three privacy modes — including a true Invisible.",
                'Campground check-ins expire after 24 hours.',
                'No ads. No scraping. No selling guest data.',
              ].map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-white/5 bg-card px-4 py-3 text-sm text-cream flex items-start gap-2"
                >
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Benefits — 3 cards */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>Why campgrounds offer it</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                A small amenity. A big return.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  emoji: '✨',
                  title: 'Better guest experience',
                  body: "Solo travelers and weekenders feel welcome from the moment they pull in. The campground gets warmer.",
                },
                {
                  emoji: '🔥',
                  title: 'More community',
                  body: 'Coffee meetups, fire-ring crews, trail buddies — they happen on their own once people can find each other.',
                },
                {
                  emoji: '🔁',
                  title: 'More return visits',
                  body: 'Guests come back to the place where they met their people. RoadWave campgrounds become destinations, not pit stops.',
                },
              ].map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border border-flame/30 bg-card p-5"
                >
                  <p className="text-3xl mb-2" aria-hidden>
                    {b.emoji}
                  </p>
                  <h3 className="font-semibold text-cream mb-1">{b.title}</h3>
                  <p className="text-sm text-mist leading-snug">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Riley quote */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-2xl flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden border-2 border-flame/40 shadow-lg shadow-flame/15 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- avatar; remote-image config is more setup than this needs */}
              <img
                src="/riley.png"
                alt="Riley, your campground host"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-center sm:text-left">
              <Eyebrow>Riley · Your campground host</Eyebrow>
              <p className="mt-2 font-serif italic text-flame text-xl sm:text-2xl leading-snug">
                &ldquo;I help your guests feel welcome from the moment they pull in.&rdquo;
              </p>
              <p className="mt-2 text-sm text-mist">
                Built into every RoadWave-Friendly campground.
              </p>
            </div>
          </div>
        </section>

        {/* CTA form */}
        <section
          id="request-demo"
          className="px-4 py-16 border-t border-white/5 bg-flame/[0.06]"
        >
          <div className="mx-auto max-w-md">
            <div className="text-center mb-6 space-y-2">
              <Eyebrow>Request a demo</Eyebrow>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-cream">
                See RoadWave with your campground name built in.
              </h2>
              <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
                A short walkthrough, your campground name baked in.
              </p>
            </div>
            <CampgroundLeadForm />
            <p className="mt-4 text-center text-sm text-mist leading-snug">
              We&apos;ll follow up with a personalized demo link. No commitment
              required.
            </p>
          </div>
        </section>
      </main>

      <footer className="px-4 py-8 text-center text-xs text-mist/70 border-t border-white/5">
        <p>RoadWave — Privacy-first campground connections.</p>
      </footer>

      <CampgroundRileyButton />
    </>
  )
}

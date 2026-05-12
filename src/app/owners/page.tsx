import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { InteractiveDemo } from '@/components/campgrounds/interactive-demo'
import { CampgroundRileyButton } from '@/components/campgrounds/riley-campground-button'

export const metadata: Metadata = {
  title: 'RoadWave for Campgrounds — A QR guest engagement hub',
  description:
    'A QR-code guest engagement hub for campgrounds — more reviews, repeat bookings, campground updates, contact the office, private stay feedback, and optional camper connection. Complements your reservation system.',
}

// Phase 3 owner-page rewrite. Repositions RoadWave as a QR guest
// engagement hub (not a "find friendly campers" app) with the six
// engagement value props leading: more reviews, repeat bookings,
// campground updates, contact the office, private stay feedback,
// optional camper connection. Removes the duplicate
// privacy/bulletins/updates-only sections that were all saying the
// same thing in different framings.

const VALUE_PROPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '⭐',
    title: 'More Google reviews',
    body: 'A built-in "Leave a Google Review" button on the welcome page — point it at your Google listing and let happy guests boost your ranking.',
  },
  {
    emoji: '🛎️',
    title: 'Repeat bookings',
    body: 'A "Book Your Next Stay" button with an optional message and promo code. Convert your best moment — checking out — into a return guest.',
  },
  {
    emoji: '📌',
    title: 'Campground updates',
    body: 'Post bulletins and meetup prompts (quiet hours, food trucks, weather notices, coffee hours) once — every checked-in guest sees them.',
  },
  {
    emoji: '📨',
    title: 'Contact the office',
    body: 'A categorized form (Wi-Fi, Laundry, Propane, Maintenance, Quiet hours, and more) that lands in your dashboard inbox with optional email alerts.',
  },
  {
    emoji: '🩺',
    title: 'Private stay feedback',
    body: '"How\'s your stay?" pulse check on the welcome page. The "Something needs attention" follow-up reaches you before it reaches a public review.',
  },
  {
    emoji: '👋',
    title: 'Optional camper connection',
    body: 'Guests who want to can find shared-interest neighbors. Guests who don\'t can pick "Updates Only" and never appear to other campers.',
  },
]

const STAFF_PROMISE: string[] = [
  'No public group chat to moderate',
  'No exact site numbers',
  'No app download required',
  'No guest data selling',
  'No extra front-desk system to manage',
]

export default function OwnersPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-2xl" />
        </Link>
        <nav>
          <ul className="flex items-center gap-4 sm:gap-6 text-sm">
            <li>
              <Link href="/" className="text-mist hover:text-cream transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/demo" className="text-mist hover:text-cream transition-colors">
                Demo
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-mist hover:text-cream transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-mist hover:text-cream transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero — leads with the QR engagement-hub framing */}
        <section className="px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <Eyebrow>For campground owners</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              A QR guest engagement hub for your campground.
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              RoadWave turns your check-in QR into the place guests go for
              reviews, repeat bookings, your latest updates, office
              messages, and private stay feedback — without replacing your
              reservation system.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 transition-colors"
              >
                Start My Campground Pilot
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                See the live demo
              </Link>
            </div>
          </div>
        </section>

        {/* Six value props — the heart of the new positioning */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>What RoadWave does for your campground</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Six tools, one QR code.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Each one runs on the same welcome page guests land on
                after scanning. Turn any of them on or off from your
                dashboard.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_PROPS.map((v) => (
                <article
                  key={v.title}
                  className="rounded-2xl border border-flame/30 bg-card p-5 space-y-2"
                >
                  <p className="text-3xl" aria-hidden>
                    {v.emoji}
                  </p>
                  <h3 className="font-semibold text-cream leading-snug">
                    {v.title}
                  </h3>
                  <p className="text-sm text-mist leading-snug">{v.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Complements, doesn't replace */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <Eyebrow>Not a reservation system</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Works alongside what you already use.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              RoadWave doesn&apos;t replace Campspot, Newbook, Bonfire,
              your spreadsheet, or your phone. It&apos;s the layer that
              makes your campground feel modern after a guest pulls in —
              the one place they go for everything that isn&apos;t a
              reservation.
            </p>
          </div>
        </section>

        {/* What your staff has to do (already short, clear) */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>Built like an amenity, not another job</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                What your staff has to do.
              </h2>
              <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
                Print the QR code. Place it where guests already look. That&apos;s it.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">
              {STAFF_PROMISE.map((p) => (
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

        {/* Owner dashboard — what you see vs don't */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="text-center space-y-2">
              <Eyebrow>Owner dashboard</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                See engagement. Not private guest details.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-flame/30 bg-card p-5">
                <h3 className="font-semibold text-cream mb-2">
                  What you see
                </h3>
                <ul className="text-sm text-mist leading-snug list-disc list-inside space-y-1">
                  <li>QR scans, check-ins, bulletin views</li>
                  <li>Review and Book Again click counts</li>
                  <li>Office messages and pulse-check alerts</li>
                  <li>Popular guest interests (aggregate)</li>
                  <li>Weekly summary email every Monday</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-card p-5">
                <h3 className="font-semibold text-cream mb-2">
                  What you don&apos;t see
                </h3>
                <ul className="text-sm text-mist leading-snug list-disc list-inside space-y-1">
                  <li>Exact site numbers</li>
                  <li>Private guest messages</li>
                  <li>Who waved at whom</li>
                  <li>Real names or emails</li>
                  <li>Anything sold to third parties</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Riley — keep the friendly hook */}
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
                &ldquo;I help your guests feel welcome from the moment
                they pull in.&rdquo;
              </p>
              <p className="mt-2 text-sm text-mist">
                Built into every RoadWave-friendly campground.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive demo wizard — customizes the live demo with the
            owner's campground name, logo, and city, then produces a
            shareable preview link. The hero "See the live demo" CTA
            now goes straight to /demo (the Pages-Router live demo);
            this section is the "build my own branded version" path. */}
        <section
          id="request-demo"
          className="px-4 py-16 border-t border-white/5 bg-flame/[0.06]"
        >
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-8 space-y-2">
              <Eyebrow>Build my free campground demo</Eyebrow>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-cream">
                Customize this with my campground name.
              </h2>
              <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
                Three quick steps. A shareable preview branded with your
                campground name, logo, and city.
              </p>
            </div>
            <InteractiveDemo />
          </div>
        </section>

        {/* Soft pricing reassurance — kept intentionally vague.
            We aren't ready to commit to a public $/month figure until
            more campgrounds have been through the pilot, so this just
            signals "monthly, no contract, partner-friendly" without
            anchoring a number. */}
        <section className="px-4 py-12 border-t border-white/5">
          <div className="mx-auto max-w-2xl rounded-2xl border border-flame/30 bg-flame/[0.04] p-6 sm:p-8 text-center space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
              Founding Campground Pilot
            </p>
            <p className="text-cream text-base sm:text-lg leading-relaxed">
              Simple monthly pricing. Cancel anytime. Early partner
              pricing available for the first parks that help shape
              RoadWave.
            </p>
            <p className="text-xs text-mist leading-snug">
              No long-term contract. No hardware. No app-store setup.
            </p>
          </div>
        </section>

        {/* Final CTA — point to the self-serve funnel */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Ready to activate your campground?
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Sign up in two minutes. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 transition-colors"
              >
                Start My Campground Pilot
              </Link>
            </div>
          </div>
        </section>
      </main>

      <CampgroundRileyButton />
    </>
  )
}

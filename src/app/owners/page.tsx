import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { InteractiveDemo } from '@/components/campgrounds/interactive-demo'
import { CampgroundRileyButton } from '@/components/campgrounds/riley-campground-button'

export const metadata: Metadata = {
  title: 'RoadWave for Campgrounds — Help guests feel welcome faster',
  description:
    'A simple QR-code guest amenity that helps campers find friendly people, shared activities, and familiar faces — without public group chats, exact site numbers, or extra work for your staff.',
}

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
              <Link
                href="/"
                className="text-mist hover:text-cream transition-colors"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/demo"
                className="text-mist hover:text-cream transition-colors"
              >
                Demo
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-mist hover:text-cream transition-colors"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-mist hover:text-cream transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero — spec §13 */}
        <section className="px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <Eyebrow>For campground owners</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Help guests feel welcome faster.
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              RoadWave is a simple QR-code guest amenity that helps campers
              find friendly people, shared activities, and familiar faces
              inside your campground — without public group chats, exact
              site numbers, or extra work for your staff.
            </p>
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-flame font-semibold">
              No exact site numbers. No public group chat. No app download required.
              Guests control their visibility.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Start My Campground Pilot
              </Link>
            </div>
          </div>
        </section>

        {/* Problem — spec §17 copy replacements applied */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Your guests want connection. The current options were not built for campground connection.
            </h2>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Facebook groups. Site-number swaps. Awkward small talk around the park.
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
                  body: 'Guests should not have to share their exact site number just to say hello.',
                },
                {
                  emoji: '🤐',
                  title: 'Open group chats get noisy fast.',
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

        {/* Staff workload — spec §14 (NEW) */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>Built like an amenity, not another job</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                What your staff has to do
              </h2>
              <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
                Print the QR code. Place it where guests already look. That&apos;s it.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">
              {[
                'No public group chat to moderate',
                'No exact site numbers',
                'No guest data selling',
                'No app download required',
                'No extra front-desk system to manage',
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
            <p className="text-center text-mist text-sm sm:text-base leading-relaxed pt-2">
              RoadWave is designed to feel like an amenity, not another job
              for your staff.
            </p>
          </div>
        </section>

        {/* QR placement — spec §15 (NEW) */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>Where the code lives</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Where the QR code goes
              </h2>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                'Welcome packet',
                'Front desk sign',
                'Activity board',
                'Laundry room sign',
                'Clubhouse sign',
                'Check-in email',
                'Rules handout',
              ].map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-white/10 bg-card/40 px-3 py-2 text-sm text-cream"
                >
                  <span className="text-flame mr-2" aria-hidden>
                    📌
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-5 sm:p-6 max-w-2xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Suggested QR code copy
              </p>
              <p className="mt-2 text-cream text-base sm:text-lg leading-relaxed">
                Curious who else here shares your interests? Scan to see
                campers checked in here — or just see campground bulletins and
                meetups. No exact site numbers. No public group chat. Visible,
                Quiet, Invisible, or Campground Updates Only — your call.
              </p>
            </div>
          </div>
        </section>

        {/* Solution — branded guest page */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <Eyebrow>The fix</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              A branded campground guest page powered by your QR code.
            </h2>
            <p className="text-mist max-w-2xl mx-auto leading-relaxed">
              Guests scan your QR code and land on a page that feels
              connected to your campground. They can:
            </p>
            <ul className="text-left grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto pt-2">
              {[
                'See campground bulletins',
                'Find meetup prompts',
                'Choose Visible, Quiet, Invisible, or Campground Updates Only',
                'Browse campers who share their interests',
                'Send a wave',
                'Open a private hello only when both people wave',
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

        {/* How it works — 4 steps */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                From QR code to friendly hello in a few taps.
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
                  body: 'Visible, Quiet, Invisible, or Campground Updates Only. Per-field sharing toggles.',
                },
                {
                  emoji: '📍',
                  title: 'Stay in the loop',
                  body: 'Even guests who pick Campground Updates Only still see your bulletins, weather, quiet hours, and meetups.',
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
                'Site numbers are not shared in the app.',
                'A wave is private until both sides wave back.',
                'Four privacy modes — Visible, Quiet, Invisible, or Campground Updates Only.',
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

        {/* Benefits — 4 cards */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>What you get</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                A small amenity. A big return.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  emoji: '🏕️',
                  title: 'Branded campground guest page',
                  body: 'A QR code that lands guests on a page that feels connected to your campground — not a generic app.',
                },
                {
                  emoji: '📌',
                  title: 'Campground bulletins and meetup prompts',
                  body: 'Coffee hours, food trucks, dog walks, pickleball, campfires, weather notices, quiet-hour reminders — one place to share what is happening.',
                },
                {
                  emoji: '📍',
                  title: 'Campground Updates Only for private guests',
                  body: 'Quiet guests still see your bulletins and meetups while staying invisible to other campers.',
                },
                {
                  emoji: '📊',
                  title: 'Privacy-safe owner dashboard',
                  body: 'Aggregate engagement stats — check-ins, bulletin views, mutual waves — never private messages or personal data.',
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

        {/* Some guests want to meet, others just want updates */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <Eyebrow>Two kinds of guests, one amenity</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Some guests want to meet. Others just want updates.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Guests can choose Campground Updates Only to see official
              campground bulletins, activity reminders, weather notices, food
              truck updates, quiet-hour reminders, and meetup prompts —
              without appearing to other campers or participating in waves.
            </p>
          </div>
        </section>

        {/* Keep guests in the loop */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>Bulletins &amp; meetups</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Keep guests in the loop without starting a noisy group chat.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                RoadWave helps your campground share simple bulletins,
                activity reminders, and meetup prompts with checked-in
                guests — things like coffee hours, food trucks, dog walks,
                pickleball, campfires, weather notices, quiet-hour
                reminders. Guests get one easy place to see what&apos;s
                happening without creating an open public group chat your staff
                has to moderate.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto">
              {[
                'Coffee at the clubhouse, 8 AM',
                'Food truck tonight, 5–8 PM',
                'Quiet hours reminder',
                'Weather notice or storm prep',
                'Office closures and check-out reminders',
                'Hosted meetups and activities',
              ].map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-white/5 bg-card px-4 py-3 text-sm text-cream flex items-start gap-2"
                >
                  <span className="text-flame mt-0.5" aria-hidden>
                    📌
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Owner dashboard — what owners see and don't see */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="text-center space-y-2">
              <Eyebrow>Owner dashboard</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                See guest engagement without seeing private guest details.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-flame/30 bg-card p-5">
                <h3 className="font-semibold text-cream mb-2">What owners can see</h3>
                <ul className="text-sm text-mist leading-snug list-disc list-inside space-y-1">
                  <li>QR code scans</li>
                  <li>Guest check-ins</li>
                  <li>Bulletin views</li>
                  <li>Meetup interest</li>
                  <li>Waves sent</li>
                  <li>Mutual waves</li>
                  <li>Popular guest interests</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-card p-5">
                <h3 className="font-semibold text-cream mb-2">What owners cannot see</h3>
                <ul className="text-sm text-mist leading-snug list-disc list-inside space-y-1">
                  <li>Exact site numbers</li>
                  <li>Private messages</li>
                  <li>Who waved at whom</li>
                  <li>Guest-to-guest conversations</li>
                  <li>Exact guest locations</li>
                  <li>Private profile details</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Campground Updates Only feature block */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2">
              <Eyebrow>New privacy mode</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Campground Updates Only.
              </h2>
              <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
                For guests who want the campground&apos;s info — and nothing else.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-flame/30 bg-card p-5">
                <h3 className="font-semibold text-cream mb-1">What they still see</h3>
                <ul className="text-sm text-mist leading-snug list-disc list-inside space-y-1">
                  <li>Campground bulletins and notices</li>
                  <li>Hosted meetups + activities</li>
                  <li>Per-toggle control over both</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-card p-5">
                <h3 className="font-semibold text-cream mb-1">What other campers see</h3>
                <ul className="text-sm text-mist leading-snug list-disc list-inside space-y-1">
                  <li>Nothing. They&apos;re invisible to other guests.</li>
                  <li>Can&apos;t send or receive waves.</li>
                  <li>Still counts as a checked-in guest for your stats.</li>
                </ul>
              </div>
            </div>
            <p className="text-center text-mist text-sm sm:text-base leading-relaxed pt-2 max-w-xl mx-auto">
              The same QR code works for everyone, whether they want to
              connect with other guests or just keep tabs on what&apos;s
              happening at your campground.
            </p>
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

        {/* Interactive demo wizard */}
        <section
          id="request-demo"
          className="px-4 py-16 border-t border-white/5 bg-flame/[0.06]"
        >
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-8 space-y-2">
              <Eyebrow>Try it now — no sign-up</Eyebrow>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-cream">
                See RoadWave with your campground name built in.
              </h2>
              <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
                Three quick steps. Yours to share.
              </p>
            </div>
            <InteractiveDemo />
          </div>
        </section>

        {/* Final CTA — point to the self-serve funnel */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Ready to activate your campground?
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Sign up in two minutes. Cancel anytime. No hardware. No
              app-store setup.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
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

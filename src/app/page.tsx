import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CampgroundRequestForm } from '@/components/campgrounds/request-form'
import { HomePhonePreview } from '@/components/home/home-phone-preview'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const STEPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '📷',
    title: 'Scan the campground QR code',
    body: 'Find RoadWave on the welcome card, front desk sign, check-in email, or activity board.',
  },
  {
    emoji: '👁',
    title: 'Choose how visible you want to be',
    body: 'Be visible, stay quiet, go invisible, or just see campground updates. You control whether other campers can see you.',
  },
  {
    emoji: '🎯',
    title: 'See shared interests',
    body: 'Find campers open to dog walks, coffee, cards, pickleball, campfires, fishing, hiking, kayaking, or local exploring.',
  },
  {
    emoji: '👋',
    title: 'Wave first',
    body: 'If they wave back, a private hello opens. If they don’t, nothing awkward happens.',
  },
]

const PRIVACY_BULLETS: string[] = [
  'No exact site numbers',
  'No public campground chat',
  'No pressure to participate',
  'No one sees you unless you choose to be visible',
  'Check-ins are temporary',
  'You can go Invisible anytime',
  'Switch to Campground Updates Only whenever you just want updates',
]

const USE_OPTIONS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '👋',
    title: 'Use it socially',
    body: 'Be Visible, browse campers checked in here, and wave at folks who share your interests.',
  },
  {
    emoji: '🤫',
    title: 'Use it quietly',
    body: 'Stay Quiet or Invisible. Look around without showing up — wave first only if someone catches your eye.',
  },
  {
    emoji: '📍',
    title: 'Use it for updates only',
    body: 'Campground Updates Only — see bulletins, weather, quiet hours, and meetups, hidden from other campers.',
  },
]

const WHO_ITS_FOR: { title: string; body: string }[] = [
  {
    title: 'Solo travelers',
    body: 'Solo travelers who want a safer way to connect.',
  },
  {
    title: 'Couples',
    body: 'Couples open to meeting other campers.',
  },
  {
    title: 'Families',
    body: 'Families looking for activities.',
  },
  {
    title: 'Snowbirds + long-term guests',
    body: 'Snowbirds and long-term guests.',
  },
  {
    title: 'Weekend campers',
    body: 'Weekend campers who want to find friendly people checked in at the same campground.',
  },
  {
    title: 'Campers who prefer quiet',
    body: 'Campers who prefer quiet but still want the option.',
  },
]

const FB_DIFF_BULLETS: string[] = [
  'Campground-specific',
  'Temporary check-ins',
  'Mutual waves before private hellos',
  'No exact site numbers',
  'No public posting required',
]

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    if (!user.email_confirmed_at) redirect('/verify')
    // Owners and super-admins go straight to their dashboard.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'owner' || profile?.role === 'super_admin') {
      redirect('/owner/dashboard')
    }
    redirect('/home')
  }

  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Logo className="text-2xl" />
        <Link
          href="/login"
          className="rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-1.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
        >
          Sign in
        </Link>
      </header>

      <main>
        {/* Hero — spec §7 */}
        <section className="px-4 pt-6 pb-10 sm:pt-16 sm:pb-14">
          <div className="mx-auto max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-5 text-center lg:text-left">
              <Eyebrow>A private way to meet campers who share your interests</Eyebrow>
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
                Curious who else here shares your interests?
              </h1>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                RoadWave helps campers find friendly people at the same
                campground — without exact site numbers, public group chats,
                or pressure.
              </p>
              <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
                Wave when you want. Stay quiet when you don&apos;t. Go
                invisible anytime — or just keep an eye on campground
                updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-base font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
                >
                  Try the Demo <span aria-hidden>👋</span>
                </Link>
                <a
                  href="#owner-section"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 text-base font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
                >
                  I Run a Campground
                </a>
              </div>
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-flame/90 font-semibold pt-2">
                No exact site numbers. No public group chats. No pressure.
                Visible, Quiet, Invisible, or Campground Updates Only — your
                call. No download required.
              </p>
            </div>
            <div className="lg:pl-4">
              <HomePhonePreview />
            </div>
          </div>
        </section>

        {/* How it works — spec §8 */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                A simple way to find campers who like what you like.
              </h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="rounded-2xl border border-white/5 bg-card p-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-flame text-night font-display text-sm font-extrabold">
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

        {/* Choose how you want to use RoadWave */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>Three ways to use it</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Choose how you want to use RoadWave.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
                Same app, three different vibes. Switch any time.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {USE_OPTIONS.map((o) => (
                <div
                  key={o.title}
                  className="rounded-2xl border border-white/5 bg-card p-5"
                >
                  <div className="text-2xl mb-2" aria-hidden>
                    {o.emoji}
                  </div>
                  <h3 className="font-semibold text-cream mb-1">{o.title}</h3>
                  <p className="text-sm text-mist leading-snug">{o.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy — spec §9 */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>You stay in control</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              You control the whole experience.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              RoadWave is designed for campground comfort, not public
              broadcasting.
            </p>
            <ul className="text-left grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto pt-2">
              {PRIVACY_BULLETS.map((p) => (
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
            <div className="pt-2">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Try the Demo <span aria-hidden>👋</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Who it's for — spec §10 */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>Who it&apos;s for</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                For campers who want the option — not the obligation.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WHO_ITS_FOR.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-white/5 bg-card p-5"
                >
                  <h3 className="font-semibold text-cream mb-1">{c.title}</h3>
                  <p className="text-sm text-mist leading-snug">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Better than Facebook — spec §11 */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>Different on purpose</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Not another noisy group chat.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Unlike Facebook groups or open campground chats, RoadWave is
              only for the campground you&apos;re staying in — and only works
              when both people choose to wave.
            </p>
            <ul className="text-left grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto pt-2">
              {FB_DIFF_BULLETS.map((p) => (
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

        {/* Final CTA — spec §12 */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <Eyebrow>Try it</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Want to see how it feels?
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Try RoadWave with sample campground data. No account needed.
              No download required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Try the Demo <span aria-hidden>👋</span>
              </Link>
              <a
                href="#owner-section"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
              >
                I Run a Campground
              </a>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6 max-w-md mx-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist/80 font-semibold mb-3">
                Don&apos;t see your campground?
              </p>
              <CampgroundRequestForm />
            </div>
          </div>
        </section>

        {/* Collapsible owner section. The hero and final-CTA "I Run a
            Campground" buttons anchor-scroll to #owner-section here.
            Native <details>/<summary> for the outer collapse and each
            inner item — no JS state needed, accessible by default. */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-3xl">
            <details
              id="owner-section"
              className="group rounded-2xl border border-flame/30 bg-card/40 overflow-hidden"
            >
              <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-5 py-4 hover:bg-flame/[0.04] transition-colors [&::-webkit-details-marker]:hidden">
                <span className="text-base sm:text-lg font-semibold text-cream">
                  Are you a campground owner?
                </span>
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-flame/40 text-flame text-lg font-bold leading-none transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>

              <div className="px-5 pb-6 pt-2 space-y-10 border-t border-white/5">
                {/* SECTION A — Owner Pitch */}
                <div className="space-y-4 pt-4">
                  <Eyebrow>For campground owners</Eyebrow>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-tight">
                    A branded campground guest page powered by your QR code.
                  </h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {[
                      'Branded campground guest page',
                      'Campground bulletins and meetup prompts',
                      'Campground Updates Only for private guests',
                      'Privacy-safe owner dashboard with engagement stats',
                    ].map((b) => (
                      <li
                        key={b}
                        className="rounded-xl border border-white/5 bg-card px-3 py-2 text-sm text-cream flex items-start gap-2"
                      >
                        <span className="text-flame mt-0.5" aria-hidden>
                          ✓
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-xl border border-flame/30 bg-flame/[0.06] p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                        Founding rate
                      </p>
                      <p className="text-cream font-semibold text-lg">
                        $39<span className="text-mist text-sm font-medium">/month</span>
                      </p>
                    </div>
                    <Link
                      href="/start"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
                    >
                      Get Started <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>

                {/* SECTION B — How It Works for You */}
                <div className="space-y-3">
                  <Eyebrow>How it works for you</Eyebrow>
                  <h3 className="font-display text-xl font-extrabold text-cream">
                    Your owner steps
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        title: '1. Your branded guest page',
                        body: 'Guests scan your QR code and land on a page connected to your campground — your branding, your bulletins, your meetups.',
                      },
                      {
                        title: '2. Your QR code',
                        body: 'Print and place at check-in, the office window, the bulletin board, or the bath houses. No app download required for guests.',
                      },
                      {
                        title: '3. Your front-desk script',
                        body: 'One sentence at check-in: “Scan the QR at the office to see what’s happening this weekend.”',
                      },
                      {
                        title: '4. Your admin dashboard',
                        body: 'Post bulletins, meetup prompts, and see privacy-safe engagement stats — without seeing private guest details.',
                      },
                    ].map((s) => (
                      <details
                        key={s.title}
                        className="group/inner rounded-xl border border-white/10 bg-card overflow-hidden"
                      >
                        <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                          <span className="text-sm font-semibold text-cream">
                            {s.title}
                          </span>
                          <span
                            className="text-flame text-lg font-bold leading-none transition-transform group-open/inner:rotate-45"
                            aria-hidden
                          >
                            +
                          </span>
                        </summary>
                        <p className="px-4 pb-4 text-sm text-mist leading-relaxed">
                          {s.body}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>

                {/* SECTION C — How It Works for Your Guests */}
                <div className="space-y-3">
                  <Eyebrow>How it works for your guests</Eyebrow>
                  <h3 className="font-display text-xl font-extrabold text-cream">
                    Your guest steps
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        title: '1. Guest scans the QR code',
                        body: 'Lands on your branded guest page instantly. No download, no account required just to look around.',
                      },
                      {
                        title: '2. Guest checks in',
                        body: 'Picks travel style and interests. Check-in expires automatically after 24 hours.',
                      },
                      {
                        title: '3. Guest chooses a privacy mode',
                        body: 'Visible, Quiet, Invisible, or Campground Updates Only. They can switch any time, in one tap.',
                      },
                      {
                        title: '4. Guest sees your bulletins and meetup prompts',
                        body: 'One easy place for everything happening at your campground today.',
                      },
                      {
                        title: '5. Guest browses campers who share their interests (optional)',
                        body: 'No exact site numbers shown. Browsing is opt-in via Visible or Quiet mode.',
                      },
                      {
                        title: '6. Optional wave',
                        body: 'A private hello only opens when both people wave. No public group chat, no comment threads.',
                      },
                    ].map((s) => (
                      <details
                        key={s.title}
                        className="group/inner rounded-xl border border-white/10 bg-card overflow-hidden"
                      >
                        <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                          <span className="text-sm font-semibold text-cream">
                            {s.title}
                          </span>
                          <span
                            className="text-flame text-lg font-bold leading-none transition-transform group-open/inner:rotate-45"
                            aria-hidden
                          >
                            +
                          </span>
                        </summary>
                        <p className="px-4 pb-4 text-sm text-mist leading-relaxed">
                          {s.body}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>

                {/* SECTION D — What You Can and Cannot See */}
                <div className="space-y-3">
                  <Eyebrow>What you can and cannot see</Eyebrow>
                  <h3 className="font-display text-xl font-extrabold text-cream">
                    Privacy-safe by design
                  </h3>
                  <div className="space-y-2">
                    <details className="group/inner rounded-xl border border-flame/30 bg-card overflow-hidden">
                      <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold text-cream">
                          What you can see
                        </span>
                        <span
                          className="text-flame text-lg font-bold leading-none transition-transform group-open/inner:rotate-45"
                          aria-hidden
                        >
                          +
                        </span>
                      </summary>
                      <ul className="px-4 pb-4 text-sm text-mist list-disc list-inside space-y-1">
                        <li>QR code scans</li>
                        <li>Guest check-ins</li>
                        <li>Bulletin views</li>
                        <li>Meetup interest</li>
                        <li>Popular guest interests</li>
                      </ul>
                    </details>
                    <details className="group/inner rounded-xl border border-white/10 bg-card overflow-hidden">
                      <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold text-cream">
                          What you cannot see
                        </span>
                        <span
                          className="text-flame text-lg font-bold leading-none transition-transform group-open/inner:rotate-45"
                          aria-hidden
                        >
                          +
                        </span>
                      </summary>
                      <ul className="px-4 pb-4 text-sm text-mist list-disc list-inside space-y-1">
                        <li>Private messages</li>
                        <li>Exact site numbers</li>
                        <li>Who waved at whom</li>
                        <li>Guest-to-guest conversations</li>
                        <li>Exact guest locations</li>
                      </ul>
                    </details>
                  </div>
                </div>

                {/* SECTION E — Privacy and Safety */}
                <div className="space-y-3">
                  <Eyebrow>Privacy and safety</Eyebrow>
                  <h3 className="font-display text-xl font-extrabold text-cream">
                    The guardrails
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        title: 'No exact site numbers',
                        body: 'Site numbers are never displayed in the app. Guests can share their site 1:1 via private hello after a mutual wave — never publicly.',
                      },
                      {
                        title: 'No public group chat',
                        body: 'Guests can\'t post to a public feed. Bulletins go from you to all checked-in guests; private hellos only open after both sides wave.',
                      },
                      {
                        title: '18+ required',
                        body: 'Guests confirm they\'re 18 or older during signup. Underage accounts are removed.',
                      },
                      {
                        title: 'Campground Updates Only for private guests',
                        body: 'Guests who want only your bulletins and meetups can pick Campground Updates Only — they\'re invisible to other campers and can\'t send or receive waves.',
                      },
                      {
                        title: 'You are not responsible for guest-to-guest interactions after a mutual wave',
                        body: 'Once two guests have mutually waved and a private hello is open, that conversation is between them. Your campground isn\'t the host of the conversation.',
                      },
                    ].map((s) => (
                      <details
                        key={s.title}
                        className="group/inner rounded-xl border border-white/10 bg-card overflow-hidden"
                      >
                        <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                          <span className="text-sm font-semibold text-cream">
                            {s.title}
                          </span>
                          <span
                            className="text-flame text-lg font-bold leading-none transition-transform group-open/inner:rotate-45"
                            aria-hidden
                          >
                            +
                          </span>
                        </summary>
                        <p className="px-4 pb-4 text-sm text-mist leading-relaxed">
                          {s.body}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>
      </main>
    </>
  )
}

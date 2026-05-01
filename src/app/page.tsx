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
                <Link
                  href="/owners"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 text-base font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
                >
                  I Run a Campground
                </Link>
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
              <Link
                href="/owners"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
              >
                I Run a Campground
              </Link>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6 max-w-md mx-auto">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist/80 font-semibold mb-3">
                Don&apos;t see your campground?
              </p>
              <CampgroundRequestForm />
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

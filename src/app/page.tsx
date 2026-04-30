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
    title: 'Scan the QR',
    body: 'Use the campground RoadWave QR code from the office, welcome packet, map, or activity board.',
  },
  {
    emoji: '🕒',
    title: 'Check in for 24 hours',
    body: 'Join that campground temporarily. No permanent location broadcasting.',
  },
  {
    emoji: '👁',
    title: 'Pick your vibe',
    body: 'Choose Visible, Quiet, or Invisible. You control what others can see.',
  },
  {
    emoji: '👋',
    title: 'Wave when it feels right',
    body: 'A mutual wave opens a private hello. No wave-back? No one knows.',
  },
]

const PRIVACY_MODES: { icon: string; label: string; body: string }[] = [
  {
    icon: '👁',
    label: 'Visible',
    body: 'You appear to other checked-in campers and are open to waves.',
  },
  {
    icon: '🤫',
    label: 'Quiet',
    body: 'You stay hidden unless you choose to wave first.',
  },
  {
    icon: '👻',
    label: 'Invisible',
    body: 'You can browse privately without appearing to anyone.',
  },
]

const EXAMPLE_CAMPGROUNDS: { name: string; loc: string }[] = [
  { name: 'Riverbend RV Park', loc: 'Asheville, NC' },
  { name: 'Coastal Pines Campground', loc: 'Bandon, OR' },
  { name: 'Oak Hollow RV Resort', loc: 'Texas Hill Country' },
  { name: 'Pine Lake Campground', loc: 'Northern Wisconsin' },
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
        {/* Hero — single dominant CTA + secondary, with phone preview
            above the fold. The previous two-path cards are gone since
            their CTAs would compete with the hero buttons. */}
        <section className="px-4 pt-6 pb-10 sm:pt-16 sm:pb-14">
          <div className="mx-auto max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-5 text-center lg:text-left">
              <Eyebrow>Private campground check-ins for RVers</Eyebrow>
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
                Meet friendly campers at your campground without making it weird.
              </h1>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                RoadWave helps campers connect around shared interests through
                private, temporary campground check-ins.
              </p>
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-flame font-semibold">
                No exact site numbers. No public group chats. No pressure.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-base font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
                >
                  Try the Demo <span aria-hidden>👋</span>
                </Link>
                <Link
                  href="/campgrounds"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 text-base font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
                >
                  I Run a Campground
                </Link>
              </div>
            </div>
            <div className="lg:pl-4">
              <HomePhonePreview />
            </div>
          </div>
        </section>

        {/* What makes RoadWave different — Facebook differentiator. */}
        <section className="px-4 pb-10 sm:pb-12 border-t border-white/5 pt-8 sm:pt-10">
          <div className="mx-auto max-w-3xl">
            <p className="rounded-2xl border border-flame/30 bg-flame/[0.05] px-5 py-4 sm:px-6 sm:py-5 text-center text-cream text-base sm:text-lg leading-relaxed">
              Unlike Facebook groups or campground-wide chats, RoadWave is
              temporary, campground-specific, privacy-controlled, and built
              around mutual interest before messaging.
            </p>
          </div>
        </section>

        {/* Quieter secondary entry-point row — small audience cards, lower
            visual weight than the hero CTAs. Both link to the same destinations
            as the hero buttons; this gives a second take-action moment for
            people who scrolled past the hero without clicking. */}
        <section className="px-4 pb-10 sm:pb-14">
          <div className="mx-auto max-w-3xl grid gap-3 sm:grid-cols-2">
            <Link
              href="/demo"
              className="group flex items-start gap-3 rounded-xl border border-white/10 bg-card px-4 py-3 hover:border-flame/40 hover:bg-card/80 transition-colors"
            >
              <span className="text-2xl shrink-0" aria-hidden>
                🚐
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cream leading-tight">
                  I&apos;m an RVer
                </p>
                <p className="text-xs text-mist leading-snug mt-0.5">
                  Find nearby campers open to a wave or a quick hello.
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-flame">
                  Try the demo →
                </p>
              </div>
            </Link>
            <Link
              href="/campgrounds"
              className="group flex items-start gap-3 rounded-xl border border-white/10 bg-card px-4 py-3 hover:border-flame/40 hover:bg-card/80 transition-colors"
            >
              <span className="text-2xl shrink-0" aria-hidden>
                🏕️
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cream leading-tight">
                  I run a campground
                </p>
                <p className="text-xs text-mist leading-snug mt-0.5">
                  Offer guests a private QR-code amenity that helps them
                  connect safely.
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-flame">
                  See how it works →
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Four taps from check-in to campfire.
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

        {/* Works like an app */}
        <section className="px-4 py-10 border-t border-white/5">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream">
              Works like an app — no download needed.
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 text-left">
              <div className="rounded-2xl border border-white/5 bg-card p-4 flex items-start gap-3">
                <span className="text-2xl shrink-0" aria-hidden>
                  📱
                </span>
                <div>
                  <p className="font-semibold text-cream text-sm leading-tight">iPhone</p>
                  <p className="text-xs text-mist leading-snug mt-0.5">
                    Tap the Share button in Safari, then{' '}
                    <span className="text-cream">Add to Home Screen</span>.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-card p-4 flex items-start gap-3">
                <span className="text-2xl shrink-0" aria-hidden>
                  🤖
                </span>
                <div>
                  <p className="font-semibold text-cream text-sm leading-tight">Android</p>
                  <p className="text-xs text-mist leading-snug mt-0.5">
                    Tap the three dots in Chrome, then{' '}
                    <span className="text-cream">Add to Home Screen</span>.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-mist/80 italic">
              RoadWave runs in your browser. No app store. No updates. Just open and go.
            </p>
          </div>
        </section>

        {/* Privacy modes */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>Privacy modes</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              You are always in control.
            </h2>
            <div className="grid gap-3 sm:grid-cols-3 pt-4 text-left">
              {PRIVACY_MODES.map((p) => (
                <div
                  key={p.label}
                  className="rounded-2xl border border-white/5 bg-card p-5"
                >
                  <p className="text-2xl mb-2" aria-hidden>
                    {p.icon}
                  </p>
                  <h3 className="font-semibold text-cream mb-1">{p.label}</h3>
                  <p className="text-sm text-mist leading-snug">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="pt-2 font-serif italic text-flame text-base sm:text-lg leading-snug">
              RoadWave never requires exact site numbers.
            </p>
          </div>
        </section>

        {/* Example campgrounds */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-8 space-y-2">
              <Eyebrow>Example RoadWave-Friendly Campground Setup</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Example RoadWave-Friendly Campground Setup.
              </h2>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
                See how participating campgrounds could appear once RoadWave is live.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXAMPLE_CAMPGROUNDS.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-card p-4"
                >
                  <span className="text-2xl" aria-hidden>
                    🏕️
                  </span>
                  <div>
                    <p className="font-semibold text-cream leading-tight">{s.name}</p>
                    <p className="text-xs text-mist">{s.loc}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-flame">
                    Example
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-md mx-auto">
              <CampgroundRequestForm />
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/campgrounds"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Get Your Campground Listed →
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <Eyebrow>Try it</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Ready to see how it works?
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Try the demo with mock campground data. No account needed —
              explore everything first.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Try the Demo <span aria-hidden>👋</span>
              </Link>
              <Link
                href="/campgrounds"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
              >
                Get Your Campground Listed →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

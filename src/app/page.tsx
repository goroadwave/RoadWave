import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eyebrow } from '@/components/ui/eyebrow'
import { FirstVisitRedirect } from '@/components/ui/first-visit-redirect'
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
    redirect('/home')
  }

  return (
    <>
      <FirstVisitRedirect />
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
        {/* Hero */}
        <section className="px-4 pt-4 pb-3 sm:pt-16 sm:pb-10">
          <div className="mx-auto max-w-2xl text-center space-y-3 sm:space-y-5">
            <Eyebrow>Made for the campground</Eyebrow>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Meet friendly campers at your campground without making it weird.
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              RoadWave helps campers connect around shared interests through
              private, temporary campground check-ins.
            </p>
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-flame font-semibold">
              No exact site numbers · No public group chats · No pressure
            </p>
          </div>
        </section>

        {/* Two path cards */}
        <section className="px-4 pb-10 sm:pb-14">
          <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-white/5 bg-card p-5 sm:p-7 shadow-lg shadow-black/20">
              <div className="text-5xl mb-3" aria-hidden>
                🚐
              </div>
              <h2 className="font-display text-2xl font-extrabold text-cream leading-tight mb-2">
                I&apos;m an RVer
              </h2>
              <p className="text-mist text-sm leading-relaxed flex-1">
                Find nearby campers open to a wave, activity, or quick hello.
              </p>
              <Link
                href="/demo"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
              >
                Try the RVer Demo <span aria-hidden>👋</span>
              </Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-white/5 bg-card p-5 sm:p-7 shadow-lg shadow-black/20">
              <div className="text-5xl mb-3" aria-hidden>
                🏕️
              </div>
              <h2 className="font-display text-2xl font-extrabold text-cream leading-tight mb-2">
                I run a campground
              </h2>
              <p className="text-mist text-sm leading-relaxed flex-1">
                Offer guests a private QR-code amenity that helps them connect safely.
              </p>
              <Link
                href="/campgrounds"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
              >
                See Campground Demo →
              </Link>
            </article>
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
              <Eyebrow>RoadWave Friendly</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Example RoadWave-friendly campgrounds.
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

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eyebrow } from '@/components/ui/eyebrow'
import { FirstVisitRedirect } from '@/components/ui/first-visit-redirect'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
        <section className="px-4 pt-10 pb-8 sm:pt-16 sm:pb-12">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <Eyebrow>Made for the campground</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Pull into camp.
              <br />
              Find your people.
            </h1>
            <div className="space-y-1">
              <p className="font-serif italic text-flame text-xl sm:text-2xl leading-snug">
                Coffee at sunrise. Campfire at dusk. New friends at the next site over.
              </p>
              <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
                Wave when the vibe&apos;s right. Stay parked when it isn&apos;t.
              </p>
            </div>
          </div>
        </section>

        {/* Choice cards */}
        <section className="px-4 pb-12">
          <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-white/5 bg-card p-6 sm:p-7 shadow-lg shadow-black/20">
              <div className="text-5xl mb-3" aria-hidden>
                🚐
              </div>
              <h2 className="font-display text-2xl font-extrabold text-cream leading-tight mb-2">
                I&apos;m an RVer
              </h2>
              <p className="text-mist text-sm leading-relaxed flex-1">
                Find nearby campers who are open to saying hi, joining
                activities, or meeting around shared interests.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
              >
                Join the Waitlist <span aria-hidden>👋</span>
              </Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-white/5 bg-card p-6 sm:p-7 shadow-lg shadow-black/20">
              <div className="text-5xl mb-3" aria-hidden>
                🏕️
              </div>
              <h2 className="font-display text-2xl font-extrabold text-cream leading-tight mb-2">
                I run a campground
              </h2>
              <p className="text-mist text-sm leading-relaxed flex-1">
                Offer guests a private QR-code amenity that helps them
                connect without public group chats or site numbers.
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
              {[
                {
                  emoji: '📷',
                  title: 'Scan the QR',
                  body: 'Find it on the campground welcome sign. You are checked in for 24 hours.',
                },
                {
                  emoji: '👁',
                  title: 'Pick your vibe',
                  body: 'Visible, Quiet, or Invisible. Toggle individual fields on or off.',
                },
                {
                  emoji: '👀',
                  title: 'See who is around',
                  body: 'Other campers surface — filter by interests or travel style.',
                },
                {
                  emoji: '👋',
                  title: 'Wave & meet',
                  body: 'Mutual wave opens a chat. No wave-back? No one knows.',
                },
              ].map((s, i) => (
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

        {/* Privacy controls */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>Privacy controls</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              You&apos;re always in control.
            </h2>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Three modes. Per-field toggles. Nothing leaves until you say so.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 pt-4 text-left">
              {[
                {
                  icon: '👁',
                  label: 'Visible',
                  body: 'You appear in the nearby list. Open to waves.',
                },
                {
                  icon: '🤫',
                  label: 'Quiet',
                  body: 'Hidden, but you can still wave first.',
                },
                {
                  icon: '👻',
                  label: 'Invisible',
                  body: 'Browse without anyone knowing you are here.',
                },
              ].map((p) => (
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
          </div>
        </section>

        {/* RoadWave Friendly spots */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-8 space-y-2">
              <Eyebrow>RoadWave Friendly</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Spots that already offer the wave.
              </h2>
              <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
                Stay here and you&apos;re already on the list.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { name: 'Riverbend RV Park', loc: 'Asheville, NC' },
                { name: 'Coastal Pines Campground', loc: 'Bandon, OR' },
                { name: 'Oak Hollow RV Resort', loc: 'Texas Hill Country' },
                { name: 'Pine Lake Campground', loc: 'Northern Wisconsin' },
              ].map((s) => (
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
                    Friendly
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-mist mt-6">
              Run a campground?{' '}
              <Link
                href="/campgrounds"
                className="font-semibold text-flame underline-offset-2 hover:underline"
              >
                Get on the list →
              </Link>
            </p>
          </div>
        </section>

        {/* Waitlist CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <Eyebrow>Join the waitlist</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Ready to find your people?
            </h2>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Be first to wave when RoadWave rolls into your campground.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
              >
                Join the Waitlist <span aria-hidden>👋</span>
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
              >
                Try the Demo →
              </Link>
            </div>
            <p className="text-xs text-mist pt-2">
              No account needed for the demo. It&apos;s a sandbox with mock data.
            </p>
          </div>
        </section>
      </main>

      <footer className="px-4 py-8 text-center text-xs text-mist/70 border-t border-white/5">
        <p>RoadWave — Privacy-first campground connections for RVers.</p>
        <p className="mt-1">
          <Link href="/campgrounds" className="text-flame hover:underline">
            For campground owners →
          </Link>
        </p>
      </footer>
    </>
  )
}

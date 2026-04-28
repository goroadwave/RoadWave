import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'About RoadWave — Help good people find each other',
  description:
    "How RoadWave started, why we built it, and what we believe about privacy and connection on the road.",
}

export default function AboutPage() {
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
          ← Home
        </Link>
      </header>

      <main>
        {/* Mission */}
        <section className="px-4 pt-12 pb-10 sm:pt-20 sm:pb-16">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <Eyebrow>Our mission</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Help good people find each other without making it weird.
            </h1>
            <p className="font-serif italic text-flame text-xl sm:text-2xl leading-snug">
              Quiet, opt-in, kind. The way connection is supposed to feel.
            </p>
          </div>
        </section>

        {/* Founder story */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="text-center mb-4 space-y-2">
              <Eyebrow>The story</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Why I built RoadWave.
              </h2>
            </div>

            <div className="rounded-2xl border border-white/5 bg-card p-5 sm:p-7 space-y-4 text-mist leading-relaxed">
              <p>
                Hey — I&apos;m Mark. I&apos;ve spent my whole career in sales,
                which mostly means I&apos;ve spent my whole career talking to
                strangers. Some of the best conversations of my life started
                with a stranger.
              </p>
              <p>
                A few years ago I started spending stretches of time at
                campgrounds in Florida, and I kept noticing the same thing.
                Two rigs would park next to each other for four, five, six
                days. Coffee in the morning, fire in the evening, kids on
                bikes in between. And I&apos;d get to talking with the
                neighbors and we&apos;d realize — every time — that we had
                everything in common. Same hometown. Same line of work. Both
                trying to figure out what to do with a Friday afternoon.
              </p>
              <p>
                And every time, the conversation started by accident. A
                tongue jack going out. A dog getting loose. Asking to
                borrow a wrench. The connections were there the whole time;
                we just didn&apos;t have a way to surface them without
                being weird.
              </p>
              <p>
                I looked around at what existed. Facebook groups full of
                drama. Group chats full of notifications nobody wanted.
                Sharing site numbers with strangers, which felt off no
                matter how friendly they seemed. The tools were either
                public and loud, or they put people in the awkward position
                of having to ask outright.
              </p>
              <p>
                So I built RoadWave. The idea is simple: a private little
                amenity, scanned from a QR code at the welcome sign, that
                lets you see who else is parked here right now. You wave at
                anyone who looks interesting. They wave back, or they
                don&apos;t. If they don&apos;t, no one ever knows you waved.
                If they do, you say hi. That&apos;s it.
              </p>
              <p>
                The whole thing is built on the idea that connection should
                never cost you privacy, and privacy should never cost you
                connection. You should be able to have both. RoadWave is my
                attempt at making that real.
              </p>
              <p className="font-serif italic text-flame text-lg leading-snug pt-2 border-t border-white/5">
                If we cross paths at a campground someday — wave first.
                I&apos;ll wave back.
              </p>
              <p className="text-cream font-semibold">— Mark</p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>What we believe</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Three things we won&apos;t compromise on.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  emoji: '🔒',
                  title: 'Privacy is not optional',
                  body: 'Your data is yours. We collect the minimum we need, share nothing without your input, and never sell anything to anyone. Three privacy modes mean you choose how visible you are.',
                },
                {
                  emoji: '🤝',
                  title: 'Connection should never feel forced',
                  body: 'A wave is an opt-in. A wave back is an opt-in. Nobody gets pinged, nudged, or pressured. If two people want to say hi, RoadWave makes it easy. If one of them does not, RoadWave protects them.',
                },
                {
                  emoji: '🏕️',
                  title: 'Every camper deserves to feel welcome',
                  body: 'Solo travelers, weekenders, full-timers, snowbirds, families. The campground is supposed to be the warmest place you can park. We are trying to make it that for everyone who pulls in.',
                },
              ].map((v) => (
                <div
                  key={v.title}
                  className="rounded-2xl border border-white/5 bg-card p-5"
                >
                  <p className="text-3xl mb-3" aria-hidden>
                    {v.emoji}
                  </p>
                  <h3 className="font-semibold text-cream mb-1.5">{v.title}</h3>
                  <p className="text-sm text-mist leading-snug">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <Eyebrow>See it in action</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              Take RoadWave for a spin.
            </h2>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              No account needed for the demo. Mock data, real flow.
            </p>
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
      </main>
    </>
  )
}

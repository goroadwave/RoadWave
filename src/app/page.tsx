import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HomePhonePreview } from '@/components/home/home-phone-preview'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { getPostAuthDestination } from '@/lib/auth/post-auth-destination'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Public homepage. Phase 3 simplification (April 2026):
//   - 5 sections total: Hero, two choice cards, How It Works,
//     Privacy promise, final CTA.
//   - Removed the redundant "Three ways to use it", "Who it's for",
//     and "Different on purpose" sections — each repeated material
//     already covered by Hero + Privacy.
//   - Privacy bullets are stated once on the homepage, in the
//     Privacy section. Per the public-site polish brief, repeated
//     privacy lists across many sections were the main source of
//     fatigue.
//   - The "For Campgrounds" choice card was added so owners have a
//     visible entry point on the homepage without dominating it.

const STEPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '📷',
    title: 'Scan the campground QR',
    body: 'On the welcome card, front desk sign, check-in email, or activity board.',
  },
  {
    emoji: '👁',
    title: 'Pick your visibility',
    body: 'Visible, Quiet, Invisible, or Campground Updates Only. Change it any time.',
  },
  {
    emoji: '👋',
    title: 'Wave only if you want',
    body: 'A private hello opens only when both campers wave back. No public posts.',
  },
]

const PRIVACY_PROMISE: string[] = [
  'No exact site numbers',
  'No public campground-wide chat',
  'Guests control their visibility',
  'Connection is always optional',
]

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    if (!user.email_confirmed_at) redirect('/verify')
    // Same helper that /login + /owner/login + the OAuth callback use.
    // Routes owners (by profiles.role OR campground_admins membership)
    // to /owner/dashboard, everyone else to /home.
    const dest = await getPostAuthDestination(supabase, user.id, '/home')
    redirect(dest)
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
        {/* Hero — core idea, single CTA pair */}
        <section className="px-4 pt-6 pb-12 sm:pt-16 sm:pb-16">
          <div className="mx-auto max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-5 text-center lg:text-left">
              <Eyebrow>RoadWave</Eyebrow>
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
                Campground guests, connected on their terms.
              </h1>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                RoadWave helps campground guests see updates, connect
                around shared interests, and say hello only when they
                want to.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 items-center sm:items-stretch lg:items-stretch lg:justify-start justify-center">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-base font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
                >
                  Try the Demo <span aria-hidden>👋</span>
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 text-base font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
            <div className="lg:pl-4 space-y-2">
              <HomePhonePreview />
              <p className="text-center text-[11px] text-mist/70 italic">
                Sample campground preview — demo data shown
              </p>
            </div>
          </div>
        </section>

        {/* Two choice cards — For Campers / For Campgrounds */}
        <section className="px-4 pb-14 sm:pb-20">
          <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2">
            <ChoiceCard
              eyebrow="For campers"
              title="Scan a campground QR to check in"
              body="See campground updates and find campers who share your interests. Wave hello only when both people opt in."
              ctaLabel="Try the Demo"
              ctaHref="/demo"
              ctaIcon="👋"
            />
            <ChoiceCard
              eyebrow="For campgrounds"
              title="A QR guest engagement hub for your campground"
              body="Help guests leave reviews, book again, find your updates, and reach the office — without an app download or front-desk system."
              ctaLabel="See how it works"
              ctaHref="/owners"
              ctaIcon="🏕️"
              accent
            />
          </div>
        </section>

        {/* How it works — 3 steps */}
        <section className="px-4 py-14 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10 space-y-2">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Three steps. No app store.
              </h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
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

        {/* Privacy promise — one canonical place */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>Privacy promise</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              You stay in control.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              RoadWave is designed for campground comfort, not public
              broadcasting.
            </p>
            <ul className="text-left grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto pt-2">
              {PRIVACY_PROMISE.map((p) => (
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

        {/* Final CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              See what your campground feels like on RoadWave.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              No download. No public group chat. Try a sample campground
              page in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
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

function ChoiceCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  ctaIcon,
  accent = false,
}: {
  eyebrow: string
  title: string
  body: string
  ctaLabel: string
  ctaHref: string
  ctaIcon?: string
  accent?: boolean
}) {
  return (
    <article
      className={
        accent
          ? 'rounded-2xl border border-flame/40 bg-flame/[0.06] p-6 space-y-3'
          : 'rounded-2xl border border-white/10 bg-card p-6 space-y-3'
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
        {eyebrow}
      </p>
      <h2 className="font-display text-xl sm:text-2xl font-extrabold text-cream leading-tight">
        {title}
      </h2>
      <p className="text-sm text-mist leading-relaxed">{body}</p>
      <div className="pt-1">
        <Link
          href={ctaHref}
          className={
            accent
              ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors'
              : 'inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-5 py-2.5 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors'
          }
        >
          {ctaLabel} {ctaIcon && <span aria-hidden>{ctaIcon}</span>}
        </Link>
      </div>
    </article>
  )
}

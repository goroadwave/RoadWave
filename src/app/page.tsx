import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HomePhonePreview } from '@/components/home/home-phone-preview'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { getPostAuthDestination } from '@/lib/auth/post-auth-destination'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Force per-request rendering. The homepage reads the user's auth
// state and redirects signed-in owners to /owner/dashboard via
// getPostAuthDestination; without force-dynamic, an edge cache could
// serve a stale 30x redirect to a user whose session has changed
// (notably: right after sign-out). Used in tandem with the sign-out
// route's response.cookies.set pattern.
export const dynamic = 'force-dynamic'

// Public homepage. Phase 3 simplification (April 2026):
//   - Camper-focused. The homepage no longer pitches owners at all —
//     owner content lives at /owners and the footer's Campground
//     Owners column. Two-cards row was removed: the owner card was
//     selling owners in the camper flow, and the camper card just
//     mirrored the hero.
//   - 4 sections total: Hero, How It Works, Privacy promise, final
//     CTA.
//   - Privacy bullets are stated once on the homepage, in the
//     Privacy section.
//   - "Get Started" is filled-green (bg-leaf) as the brand's primary
//     action color. "Try the Demo" stays amber/flame so the camper
//     still has the demo as a clearly secondary path.

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

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string
    error_code?: string
    error_description?: string
  }>
}) {
  // Supabase redirects to its configured Site URL after a failed
  // magic-link verification with ?error=access_denied&error_code=
  // otp_expired&error_description=Email+link+is+invalid+or+has+
  // expired. When that lands on the homepage, the camper-flavored
  // marketing copy is the wrong place to surface it — bounce them
  // to the friendly /auth/sign-in?error=expired card instead. (This
  // is a stopgap until Supabase Site URL is reconfigured to point at
  // /auth/sign-in directly; see the deploy notes in the commit.)
  const sp = await searchParams
  if (sp.error_code === 'otp_expired' || sp.error === 'access_denied') {
    redirect('/auth/sign-in?error=expired')
  }

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
                The campground amenity that helps guests connect.
              </h1>
              <p className="text-mist text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                Guests find friendly faces. Owners build a campground
                people return to. No app download. No public group chat.
                No extra work.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2 items-center sm:items-stretch lg:items-stretch lg:justify-start justify-center">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 text-base font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 transition-colors"
                >
                  Try the Demo <span aria-hidden>👋</span>
                </Link>
                <Link
                  href="/owners"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 text-base font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
                >
                  For Campground Owners <span aria-hidden>→</span>
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

        {/* Soft owner pathway — subtle callout so campground owners
            have an entry point without dominating the camper-focused
            homepage. Borderless on top to sit quietly below the hero. */}
        <section className="px-4 pb-6 sm:pb-10">
          <div className="mx-auto max-w-3xl">
            <aside className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame">
                  Own or manage a campground?
                </p>
                <p className="text-sm text-mist leading-snug">
                  RoadWave helps your guests connect safely through
                  private, campground-based check-ins — without public
                  group chats, exact site numbers, or extra work for
                  your staff.
                </p>
              </div>
              <Link
                href="/owners"
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-4 py-2.5 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                See how RoadWave works for campgrounds{' '}
                <span aria-hidden>→</span>
              </Link>
            </aside>
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

        {/* Final CTA — camper-flavored, mirrors the hero pair */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              See it for yourself.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              No download. No public group chat. Try a sample campground
              page in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 transition-colors"
              >
                Check In as a Camper
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                Try the Demo <span aria-hidden>👋</span>
              </Link>
            </div>
            <p className="text-[11px] text-mist/70 pt-1">
              <Link
                href="/owners"
                className="text-flame underline-offset-2 hover:underline"
              >
                For Campground Owners →
              </Link>
            </p>
          </div>
        </section>
      </main>
    </>
  )
}


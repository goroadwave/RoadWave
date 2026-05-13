import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { WelcomeEngagement } from '@/components/campgrounds/welcome-engagement'
import { Logo } from '@/components/ui/logo'
import { splitAmenities } from '@/lib/campgrounds/amenities'
import { isQuickCheckInSlug } from '@/lib/checkin/quick-checkin-slugs'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'

// Public guest welcome page. Reached when a camper scans a campground
// QR — the QR encodes /campground/<slug>?token=<uuid>. Auth state
// determines what happens next:
//
//   * Authed visitor    → redirect immediately to /checkin?token=…
//                          so they land on the confirmation flow without
//                          seeing the welcome page they don't need.
//   * Anonymous visitor → render the welcome (header, what-is, two
//                          CTAs, four-step how-it-works, two
//                          plain-language reassurance lists). The
//                          secondary CTA opens a read-only updates
//                          view at /campground/<slug>/updates that
//                          requires no account.
//
// The pending_checkin_token cookie is set by middleware when the URL
// matches /campground/<slug>?token=<uuid>; the (app) layout reads that
// cookie post-auth and redirects to /checkin?token=… so the camper
// arrives at the right destination without needing to re-scan or
// re-paste the link.
//
// Service-role lookup is used because campground_qr_tokens is locked
// down via RLS to service-role only.

export const dynamic = 'force-dynamic'

type Params = { slug: string }

type CampgroundRow = {
  id: string
  slug: string
  name: string
  city: string | null
  region: string | null
  logo_url: string | null
  amenities: string[] | null
  is_active: boolean
  google_review_url: string | null
  booking_url: string | null
  booking_message: string | null
  booking_promo_code: string | null
  feature_review_enabled: boolean
  feature_book_again_enabled: boolean
  feature_contact_office_enabled: boolean
  feature_pulse_check_enabled: boolean
}

type TokenRow = {
  token: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('campgrounds')
    .select('name, city, region')
    .eq('slug', slug)
    .maybeSingle<{ name: string; city: string | null; region: string | null }>()
  if (!data) {
    return {
      title: 'Campground not on RoadWave yet',
      robots: { index: false, follow: false },
    }
  }
  const where = [data.city, data.region].filter(Boolean).join(', ')
  return {
    title: `${data.name} on RoadWave`,
    description: `${data.name}${where ? ` · ${where}` : ''} — campground updates, shared interests, and private hellos for guests.`,
  }
}

export default async function CampgroundLandingPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token: scannedToken } = await searchParams
  const admin = createSupabaseAdminClient()

  const { data: campground } = await admin
    .from('campgrounds')
    .select(
      'id, slug, name, city, region, logo_url, amenities, is_active, google_review_url, booking_url, booking_message, booking_promo_code, feature_review_enabled, feature_book_again_enabled, feature_contact_office_enabled, feature_pulse_check_enabled',
    )
    .eq('slug', slug)
    .maybeSingle<CampgroundRow>()

  if (!campground || !campground.is_active) notFound()

  // QR scan event: log fire-and-forget whenever the page is reached via
  // a ?token=... query. That URL only exists on the QR-printed sticker,
  // so a hit with a valid token is a real scan. We don't await — the
  // page render shouldn't block on a stats write.
  if (scannedToken && isUuid(scannedToken)) {
    void admin
      .from('campground_events')
      .insert({
        campground_id: campground.id,
        event_type: 'qr_scan',
        metadata: { source: 'welcome_page' },
      })
      .then(({ error }) => {
        if (error) {
          console.error(
            '[campground/welcome] qr_scan log failed:',
            error.message,
          )
        }
      })
  }

  // Pull the token. Prefer the one from the QR scan (?token= in URL) so
  // it's verifiable, but fall back to the campground's current token if
  // the visitor came directly to /campground/<slug> without a query.
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('token')
    .eq('campground_id', campground.id)
    .maybeSingle<TokenRow>()

  const validatedToken =
    scannedToken && isUuid(scannedToken)
      ? scannedToken
      : (tokenRow?.token ?? null)

  // Authed visitors skip the welcome and go straight to /checkin.
  // The (app) layout will then run its own auth + consent gates and
  // ConfirmCheckIn handles the actual check-in.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user && validatedToken) {
    redirect(`/checkin?token=${validatedToken}`)
  }

  const where = [campground.city, campground.region]
    .filter(Boolean)
    .join(', ')
  // Saved campgrounds.amenities mixes brand-curated labels (saved when
  // the owner ticks a checkbox) with owner-typed custom strings from
  // the "Add Your Own" section. Render them in the same row but with
  // distinct tag styles per spec — solid amber for standard, dashed
  // outlined for custom.
  const { standard: standardAmenities, custom: customAmenities } =
    splitAmenities(campground.amenities)
  const hasAmenities = standardAmenities.length + customAmenities.length > 0

  // CTA targets. For campgrounds in the QUICK_CHECKIN_SLUGS allow-list
  // (demo + test campgrounds), the primary CTA routes to /quickcheckin
  // — a public no-signup form that provisions a throwaway camper and
  // completes the check-in in one click. For every other campground we
  // keep the original behaviour: /signup → email confirm → /checkin.
  //
  // The secondary CTA always opens the read-only updates view, which
  // doesn't require an account.
  const useQuickCheckIn = isQuickCheckInSlug(campground.slug) && !!validatedToken
  const checkInUrl = validatedToken
    ? `/checkin?token=${validatedToken}`
    : '/checkin'
  const joinUrl = useQuickCheckIn
    ? `/quickcheckin?slug=${encodeURIComponent(campground.slug)}&token=${validatedToken}`
    : validatedToken
      ? `/signup?next=${encodeURIComponent(checkInUrl)}`
      : '/signup'
  const updatesUrl = `/campground/${campground.slug}/updates${
    validatedToken ? `?token=${validatedToken}` : ''
  }`

  return (
    <main className="min-h-screen bg-night text-cream">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href={
            validatedToken
              ? `/login?next=${encodeURIComponent(checkInUrl)}`
              : '/login'
          }
          className="text-xs font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </header>

      {/* Mobile bottom padding accounts for iOS Safari's URL bar and
          the home-indicator safe area so the "Check In to This
          Campground" CTAs aren't covered. Desktop falls back to the
          original sm:pb-24. */}
      <article className="px-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] sm:pb-24">
        <div className="mx-auto max-w-xl space-y-12">
          {/* ----- Header ----- */}
          <section className="text-center space-y-5 pt-4 sm:pt-8">
            {campground.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- partner logos are remote, dimensions vary; <Image /> setup not justified here
              <img
                src={campground.logo_url}
                alt={`${campground.name} logo`}
                className="mx-auto h-24 w-auto rounded-2xl border border-white/10 bg-card p-3 object-contain"
              />
            ) : (
              <div className="mx-auto h-24 w-24 rounded-2xl border border-flame/30 bg-flame/[0.06] grid place-items-center">
                <span className="font-display text-3xl font-extrabold text-flame">
                  {campground.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-flame font-semibold">
                Welcome to
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
                {campground.name}
              </h1>
              {where && (
                <p className="text-sm sm:text-base text-mist">{where}</p>
              )}
            </div>

            {hasAmenities && (
              <ul className="flex flex-wrap justify-center gap-2 pt-1">
                {standardAmenities.map((a) => (
                  <li
                    key={`s-${a}`}
                    className="rounded-full border border-flame/30 bg-flame/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-flame font-semibold"
                  >
                    {a}
                  </li>
                ))}
                {customAmenities.map((a) => (
                  <li
                    key={`c-${a}`}
                    className="rounded-full border border-dashed border-flame/50 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-flame font-semibold"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-cream/90 text-sm sm:text-base leading-relaxed max-w-lg mx-auto pt-2">
              This campground uses RoadWave to help guests see updates, find
              activities, and optionally connect with other campers —
              privately and without exact site numbers.
            </p>
          </section>

          {/* ----- What is RoadWave? ----- */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              What is RoadWave?
            </h2>
            <p className="text-cream/90 text-sm sm:text-base leading-relaxed">
              RoadWave is a private campground guest page. You can use it to
              see campground updates, find shared interests, and wave hello
              to nearby campers only if you want to. No app download. No
              public group chat. No exact site numbers. You control your
              visibility.
            </p>
          </section>

          {/* ----- CTAs ----- */}
          <section className="flex flex-col gap-3">
            <Link
              href={joinUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-4 text-base sm:text-lg font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
            >
              Check In to This Campground <span aria-hidden>👋</span>
            </Link>
            <Link
              href={updatesUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3.5 text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
            >
              Just See Campground Updates
            </Link>
            <p className="text-center text-[11px] text-mist/80 leading-snug">
              No account needed for updates. Check in only if you want to
              connect with other campers.
            </p>
          </section>

          {/* ----- Engagement Hub: Pulse Check + Review + Book Again +
                    Contact the Office. Each surface is gated by both the
                    owner's feature toggle and the data it needs (e.g. a
                    review URL). If every section is suppressed the whole
                    block renders nothing. */}
          <WelcomeEngagement
            campgroundId={campground.id}
            reviewUrl={campground.google_review_url}
            reviewEnabled={campground.feature_review_enabled}
            bookingUrl={campground.booking_url}
            bookingMessage={campground.booking_message}
            bookingPromoCode={campground.booking_promo_code}
            bookingEnabled={campground.feature_book_again_enabled}
            contactEnabled={campground.feature_contact_office_enabled}
            pulseEnabled={campground.feature_pulse_check_enabled}
          />

          {/* ----- How it works (4 steps) ----- */}
          <section className="space-y-4">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              How it Works
            </h2>
            <ol className="space-y-3">
              {HOW_IT_WORKS.map((step, idx) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 flex items-start gap-3"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-flame text-night font-display text-sm font-extrabold">
                    {idx + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-cream text-sm sm:text-base">
                      {step.title}
                    </h3>
                    <p className="text-sm text-mist leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ----- What you can use RoadWave for ----- */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              What you can use RoadWave for
            </h2>
            <ul className="grid gap-2">
              {USE_FOR.map((line) => (
                <li
                  key={line}
                  className="rounded-xl border border-white/5 bg-card px-4 py-3 text-sm text-cream/90 flex items-start gap-2"
                >
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ----- You stay in control ----- */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              You stay in control
            </h2>
            <ul className="grid gap-2">
              {STAY_IN_CONTROL.map((line) => (
                <li
                  key={line}
                  className="rounded-xl border border-flame/20 bg-flame/[0.04] px-4 py-3 text-sm text-cream/90 flex items-start gap-2"
                >
                  <span className="text-flame mt-0.5" aria-hidden>
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ----- Closing CTA ----- */}
          <section className="text-center space-y-3 pt-2">
            <Link
              href={joinUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              Check In to This Campground <span aria-hidden>👋</span>
            </Link>
            <p className="text-[11px] text-mist/70 leading-snug">
              RoadWave is an optional 18+ guest amenity. Not an emergency
              service — call 911 first, then notify campground staff.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}

const HOW_IT_WORKS: { title: string; body: string }[] = [
  {
    title: 'Check in privately',
    body: 'You check in to this campground only. Your check-in expires automatically.',
  },
  {
    title: 'Choose your visibility',
    body: 'Pick Visible, Quiet, Invisible, or Campground Updates Only.',
  },
  {
    title: 'See updates and shared interests',
    body: 'Find campground announcements, meetups, activities, reminders, and campers who share your interests.',
  },
  {
    title: 'Wave only if you want',
    body: 'A private hello only opens when both campers wave back. No public posts. No awkward rejection.',
  },
]

const USE_FOR: string[] = [
  'Campground announcements',
  'Quiet-hour reminders',
  'Weather or storm notices',
  'Coffee, cards, dog walks, pickleball, campfires, food trucks',
  'Finding campers with shared interests',
  'Staying updated without joining a public group chat',
]

const STAY_IN_CONTROL: string[] = [
  'No exact site numbers — ever',
  'No public campground chat',
  'No one sees you unless you choose a visible mode',
  'You can switch to Updates Only anytime',
  'No app download required',
]

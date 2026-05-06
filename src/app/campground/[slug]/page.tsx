import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
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
//   * Anonymous visitor → render the welcome (logo, location, amenity
//                          tags, tagline, single Join & Check In button).
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
    .select('id, slug, name, city, region, logo_url, amenities, is_active')
    .eq('slug', slug)
    .maybeSingle<CampgroundRow>()

  if (!campground || !campground.is_active) notFound()

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
  const amenities = (campground.amenities ?? []).filter(
    (a): a is string => typeof a === 'string' && a.trim().length > 0,
  )

  // Join & Check In CTA. Threads the validated token through ?next= so
  // even if the cookie bridge is somehow absent, the post-auth landing
  // can recover the destination.
  const checkInUrl = validatedToken
    ? `/checkin?token=${validatedToken}`
    : '/checkin'
  const joinUrl = validatedToken
    ? `/signup?next=${encodeURIComponent(checkInUrl)}`
    : '/signup'

  return (
    <main className="min-h-screen bg-night text-cream">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </header>

      <section className="px-4 pt-4 pb-14 sm:pt-10 sm:pb-20">
        <div className="mx-auto max-w-xl text-center space-y-6">
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

          {amenities.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-2 pt-1">
              {amenities.map((a) => (
                <li
                  key={a}
                  className="rounded-full border border-flame/30 bg-flame/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-flame font-semibold"
                >
                  {a}
                </li>
              ))}
            </ul>
          )}

          <p className="text-cream/95 text-base sm:text-lg leading-relaxed max-w-lg mx-auto pt-2">
            Connect with fellow campers staying here — wave to neighbors,
            see campground updates, and find people who share your
            interests. Free and private.
          </p>

          <div className="pt-3 flex flex-col items-center gap-3">
            <Link
              href={joinUrl}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-flame text-night px-8 py-4 text-base sm:text-lg font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
            >
              Join &amp; Check In <span aria-hidden>👋</span>
            </Link>
            <p className="text-[11px] text-mist">
              Already on RoadWave?{' '}
              <Link
                href={
                  validatedToken
                    ? `/login?next=${encodeURIComponent(checkInUrl)}`
                    : '/login'
                }
                className="font-semibold text-flame underline-offset-2 hover:underline"
              >
                Sign in instead
              </Link>
            </p>
          </div>

          <ul className="text-left grid gap-2 max-w-md mx-auto pt-4 text-sm text-cream/90">
            {[
              'No exact site numbers — ever',
              'No public group chat — mutual wave required before any private hello',
              'You control your visibility — Visible, Quiet, Invisible, or Updates Only',
            ].map((p) => (
              <li
                key={p}
                className="rounded-xl border border-white/5 bg-card px-4 py-3 flex items-start gap-2"
              >
                <span className="text-flame mt-0.5" aria-hidden>
                  ✓
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-mist/70 leading-snug pt-2 max-w-md mx-auto">
            RoadWave is an optional 18+ guest amenity. Not an emergency
            service — call 911 first, then notify campground staff.
          </p>
        </div>
      </section>
    </main>
  )
}

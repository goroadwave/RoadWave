import Link from 'next/link'
import { notFound } from 'next/navigation'
import QR from 'qrcode'
import { Logo } from '@/components/ui/logo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Public campground landing page. The QR a campground prints points
// at /checkin?token=<uuid>; this page is the human-readable companion
// at /campground/<slug> — the URL an owner can share, drop in a sign,
// or paste in an email. Anonymous + authenticated viewers both load.
//
// Lookups use the service-role client so the campground_qr_tokens row
// is readable (RLS on that table is service-role-only by design).

export const dynamic = 'force-dynamic'

type Params = { slug: string }

type CampgroundRow = {
  id: string
  slug: string
  name: string
  city: string | null
  region: string | null
  logo_url: string | null
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
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const admin = createSupabaseAdminClient()

  const { data: campground } = await admin
    .from('campgrounds')
    .select('id, slug, name, city, region, logo_url, is_active')
    .eq('slug', slug)
    .maybeSingle<CampgroundRow>()

  if (!campground || !campground.is_active) notFound()

  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('token')
    .eq('campground_id', campground.id)
    .maybeSingle<TokenRow>()

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  const checkInUrl = tokenRow
    ? `${siteUrl}/checkin?token=${tokenRow.token}`
    : `${siteUrl}/checkin`

  // Pre-render the QR PNG as a data URL so we don't need to wire up
  // an additional API route for image bytes.
  let qrDataUrl: string | null = null
  try {
    qrDataUrl = await QR.toDataURL(checkInUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 360,
      color: { dark: '#0a0f1c', light: '#ffffff' },
    })
  } catch (err) {
    console.error('[campground-landing] QR render failed:', err)
  }

  const where = [campground.city, campground.region]
    .filter(Boolean)
    .join(', ')

  return (
    <main className="min-h-screen bg-night text-cream">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href="/"
          className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          About RoadWave
        </Link>
      </header>

      <section className="px-4 pt-6 pb-14 sm:pt-12 sm:pb-20">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          {campground.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- partner logos are remote, dimensions vary; <Image /> setup not justified here
            <img
              src={campground.logo_url}
              alt={`${campground.name} logo`}
              className="mx-auto h-20 w-auto rounded-2xl border border-white/10 bg-card p-3 object-contain"
            />
          )}

          <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-flame font-semibold">
            Welcome to {campground.name}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
            {campground.name} on RoadWave
          </h1>
          {where && <p className="text-sm sm:text-base text-mist">{where}</p>}

          <p className="font-serif italic text-flame text-base sm:text-lg leading-snug max-w-xl mx-auto">
            A private way for guests to see campground updates, find shared
            interests, and say hello only when both people choose to wave.
          </p>

          {qrDataUrl && (
            <div className="mx-auto rounded-2xl border border-white/10 bg-white p-4 sm:p-5 max-w-[280px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL */}
              <img
                src={qrDataUrl}
                alt={`Scan to check in at ${campground.name}`}
                className="block w-full h-auto"
              />
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-night font-semibold">
                Scan to check in
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <Link
              href={checkInUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-base font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
            >
              Check In <span aria-hidden>👋</span>
            </Link>
          </div>

          <ul className="text-left grid gap-2 sm:grid-cols-2 max-w-xl mx-auto pt-4">
            {[
              'No exact site numbers',
              'No public group chat',
              'Guests control their visibility',
            ].map((p) => (
              <li
                key={p}
                className="rounded-xl border border-white/5 bg-card px-4 py-3 text-sm text-cream flex items-start gap-2 sm:col-span-2"
              >
                <span className="text-flame mt-0.5" aria-hidden>
                  ✓
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="pt-4 max-w-xl mx-auto text-sm text-mist leading-relaxed space-y-2">
            <p>
              RoadWave is a private campground guest amenity scanned from a
              QR code. Guests check in for 24 hours, see {campground.name}
              &rsquo;s bulletins and meetups, and can wave at other campers
              who share their interests — all without sharing exact site
              numbers or real names.
            </p>
            <p>
              Visible, Quiet, Invisible, or Campground Updates Only — every
              guest picks how they show up.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

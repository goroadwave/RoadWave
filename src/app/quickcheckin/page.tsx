import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { QuickCheckInForm } from '@/components/checkin/quick-checkin-form'
import { Logo } from '@/components/ui/logo'
import { isQuickCheckInSlug } from '@/lib/checkin/quick-checkin-slugs'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Public no-signup check-in form for allow-listed test campgrounds.
//
// URL: /quickcheckin?slug=<slug>&token=<uuid>
//
// Validations done on the server before render:
//   - slug must be in QUICK_CHECKIN_SLUGS (else 404)
//   - token must be a UUID
//   - token must match a campground_qr_tokens row
//   - that row must be linked to the campground whose slug matches
//
// If the visitor is already signed in, we bounce them to the normal
// /checkin flow — the quick-checkin path is specifically for visitors
// without an existing session.

export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata: Metadata = {
  title: 'Check in · RoadWave',
  robots: { index: false, follow: false },
}

type Search = { slug?: string; token?: string }

type Interest = { slug: string; label: string }

export default async function QuickCheckInPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const sp = await searchParams
  const slug = typeof sp.slug === 'string' ? sp.slug : ''
  const token = typeof sp.token === 'string' ? sp.token : ''

  if (!isQuickCheckInSlug(slug)) notFound()
  if (!UUID_RE.test(token)) notFound()

  // If already signed in, bounce to the standard /checkin flow with
  // the same token. The (app) layout will gate from there.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect(`/checkin?token=${token}`)

  // Verify token → campground → slug match. campground_qr_tokens is
  // service-role-only so we use the admin client.
  const admin = createSupabaseAdminClient()
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('campground_id')
    .eq('token', token)
    .maybeSingle<{ campground_id: string }>()
  if (!tokenRow?.campground_id) notFound()

  const { data: cg } = await admin
    .from('campgrounds')
    .select('id, slug, name, city, region, logo_url, is_active')
    .eq('id', tokenRow.campground_id)
    .maybeSingle<{
      id: string
      slug: string
      name: string
      city: string | null
      region: string | null
      logo_url: string | null
      is_active: boolean
    }>()
  if (!cg || !cg.is_active || cg.slug !== slug) notFound()

  // Surface the 8 quick-pick interest chips from the spec. These slugs
  // all exist in the interests table after migration 0042; the order
  // mirrors the user's stated preference.
  const QUICK_INTEREST_SLUGS = [
    'coffee',
    'dogs',
    'campfire',
    'pickleball',
    'fishing',
    'hiking',
    'board_games',
    'sunset_meetup',
  ]
  const { data: interestsData } = await admin
    .from('interests')
    .select('slug, label')
    .in('slug', QUICK_INTEREST_SLUGS)
    .returns<Interest[]>()

  // Re-order by the spec list rather than the DB id order so the
  // first chip the camper sees matches the welcome-page CTA copy.
  const interestBySlug = new Map(
    (interestsData ?? []).map((i) => [i.slug, i]),
  )
  // Use slightly friendlier labels than the raw DB rows for two of
  // the chips (the DB has "Dogs" but the spec calls for "Dog walk").
  const LABEL_OVERRIDES: Record<string, string> = {
    dogs: 'Dog walk',
  }
  const interests = QUICK_INTEREST_SLUGS.map((s) => {
    const row = interestBySlug.get(s)
    if (!row) return null
    return { slug: s, label: LABEL_OVERRIDES[s] ?? row.label }
  }).filter((x): x is Interest => x !== null)

  const where = [cg.city, cg.region].filter(Boolean).join(', ')

  return (
    <main className="min-h-screen bg-night text-cream">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href={`/campground/${cg.slug}?token=${token}`}
          className="text-xs font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Back
        </Link>
      </header>

      {/* Mobile: 8rem + iOS safe-area-inset-bottom so the full-width
          "Complete Check-In" CTA stays clear of iOS Safari's URL bar
          and the home indicator. Desktop unchanged. */}
      <article className="px-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] sm:pb-12">
        <div className="mx-auto max-w-md space-y-6">
          <section className="text-center space-y-3 pt-2">
            {cg.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- partner logos vary
              <img
                src={cg.logo_url}
                alt={`${cg.name} logo`}
                className="mx-auto h-16 w-auto rounded-2xl border border-white/10 bg-card p-2.5 object-contain"
              />
            ) : (
              <div className="mx-auto h-16 w-16 rounded-2xl border border-flame/30 bg-flame/[0.06] grid place-items-center">
                <span className="font-display text-xl font-extrabold text-flame">
                  {cg.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              Check in to
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-[1.1]">
              {cg.name}
            </h1>
            {where && <p className="text-sm text-mist">{where}</p>}
          </section>

          <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] px-4 py-3 text-sm text-cream/90 leading-relaxed">
            <p className="font-semibold text-cream mb-0.5">Privacy promise</p>
            <p>
              No exact site number. No always-on GPS. You control your
              visibility — and can switch it any time.
            </p>
          </div>

          <QuickCheckInForm
            slug={cg.slug}
            token={token}
            campgroundName={cg.name}
            interests={interests}
          />

          <p className="text-[11px] text-mist/70 leading-snug text-center px-2">
            RoadWave is an optional 18+ guest amenity. Not an emergency
            service — call 911 first, then notify campground staff.
          </p>
        </div>
      </article>
    </main>
  )
}

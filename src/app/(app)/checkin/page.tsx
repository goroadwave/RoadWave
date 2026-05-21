import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckInControls } from '@/components/checkin/check-in-controls'
import { DisclosureSection } from '@/components/campgrounds/disclosure-section'
import { AgeGate } from '@/components/ui/age-gate'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/validators/checkin'

// Fallback "you're not at a campground right now" surface. Phase 2
// (2026-05-21) retired the original "Where are you parked?" + manual
// QR-scan-as-primary-CTA framing -- the campground hub at
// /campground/<slug> is now the canonical landing for signed-in
// campers, both via the QR scan flow and via the in-app nav.
//
// This route resolves to one of three things, in priority order:
//
//   1. /checkin?token=<uuid>  -- a legacy direct-link camper-
//      connection QR (printed sticker that encodes /checkin?token=).
//      We resolve the slug for the token and forward to the unified
//      hub at /campground/<slug>?token=<uuid>, which auto-establishes
//      presence and renders the Camper Connections layer. Anonymous
//      visitors hitting this URL are already bounced by the proxy
//      through /signup, so this code path is only reached when the
//      camper is signed in.
//
//   2. The signed-in camper has an active check_ins row -- redirect
//      them straight to that campground's hub. The nav's "Campground"
//      tab points here, so this is the "open the campground I'm at"
//      shortcut.
//
//   3. No campground context at all -- render the no-context
//      fallback. Clean copy ("You're not at a campground right now"),
//      scanner + paste form tucked behind disclosures so they aren't
//      the primary affordance. This is the only time the QR scanner
//      surfaces as the primary action -- everywhere else it's a
//      utility behind a tap.

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : null

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Legacy /checkin?token=<uuid> direct link → hub.
  if (token && isUuid(token)) {
    const admin = createSupabaseAdminClient()
    const { data: tokenRow } = await admin
      .from('campground_qr_tokens')
      .select('campground_id')
      .eq('token', token)
      .maybeSingle<{ campground_id: string }>()
    if (tokenRow?.campground_id) {
      const { data: cg } = await admin
        .from('campgrounds')
        .select('slug, is_active')
        .eq('id', tokenRow.campground_id)
        .maybeSingle<{ slug: string; is_active: boolean }>()
      if (cg?.slug && cg.is_active) {
        redirect(`/campground/${cg.slug}?token=${token}`)
      }
    }
    // Fall through to fallback with a soft error -- token shape was
    // valid but no campground matches (deleted, deactivated, or a
    // typo). The page below surfaces a one-liner so the camper
    // understands why nothing happened.
  }

  // 2. Already checked into a campground -- jump them to the hub.
  const { data: activeCheckIn } = await supabase
    .from('check_ins')
    .select('campground_id, campgrounds(slug, is_active)')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      campground_id: string
      campgrounds: { slug: string; is_active: boolean } | null
    }>()
  if (
    activeCheckIn?.campgrounds?.slug &&
    activeCheckIn.campgrounds.is_active
  ) {
    redirect(`/campground/${activeCheckIn.campgrounds.slug}`)
  }

  // 3. No campground context: render the fallback.
  const showBadTokenNote = !!(token && isUuid(token))

  return (
    <AgeGate>
      <div className="space-y-6">
        <PageHeading
          eyebrow="Find a campground"
          title="You're not at a campground right now"
          subtitle="Scan your campground's RoadWave QR code to open its info hub. Wi-Fi, park map, amenities, office help, and Camper Connections all unlock from there."
        />

        {showBadTokenNote && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            That check-in link did not match a campground on RoadWave. Double-check the QR or ask the office for the latest sticker.
          </p>
        )}

        <div className="rounded-2xl border border-flame/30 bg-flame/[0.05] p-5 space-y-3">
          <p className="text-sm text-cream leading-relaxed">
            Every RoadWave campground has a QR code at the office, kiosk,
            or check-in sheet. Scan it with your phone&apos;s camera and
            its RoadWave page opens automatically &mdash; no app to
            install.
          </p>
          <p className="text-xs text-mist leading-snug">
            Once you&apos;re on a campground&apos;s hub you can sign in
            from the corner to unlock Camper Connections. Campground info
            stays available either way.
          </p>
        </div>

        <DisclosureSection
          title="Scan another campground QR"
          description="Open camera to scan a code"
        >
          {/* The original primary-CTA framing ("Allow Camera Access" as
              the loudest button on the page) is retired. The scanner
              still works; it just lives behind a tap so it isn't the
              first thing a signed-in camper sees. */}
          <CheckInControls />
        </DisclosureSection>

        <p className="text-center text-[11px] text-mist/70 leading-snug">
          Have a link instead? Open it in the same browser tab as
          RoadWave &mdash; it will load the campground&apos;s hub
          directly.
        </p>

        <p className="text-center text-xs text-mist">
          Or head back to your{' '}
          <Link
            href="/home"
            className="text-flame font-semibold underline-offset-2 hover:underline"
          >
            RoadWave home
          </Link>
          .
        </p>
      </div>
    </AgeGate>
  )
}

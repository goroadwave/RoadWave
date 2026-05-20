import { OwnerQrPanel } from '@/components/owner/owner-qr-panel'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { loadOwnerCampground } from '../_helpers'

export default async function OwnerQrPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <PageHeading
        eyebrow="QR code"
        title="No campground linked"
        subtitle="Refresh, or contact support if this persists."
      />
    )
  }

  // campground_qr_tokens has RLS enabled with no policies — only
  // service_role can read/write it (see migration 0002). Ownership has
  // already been verified by loadOwnerCampground via the
  // campground_admins join, so it's safe to use the admin client here.
  const admin = createSupabaseAdminClient()
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('token, rotated_at')
    .eq('campground_id', campground.id)
    .maybeSingle()

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'

  // Two QR URLs (Phase D of the guest-hub pivot, refined 2026-05-20):
  //   * guestHubUrl: the unified no-login guest hub. This is the
  //     Front Desk QR every campground gets by default. Works for
  //     anonymous traffic with zero account friction.
  //   * camperConnectionUrl: /checkin?token=<uuid>, the camper
  //     check-in entry point. Authed users land directly on the
  //     check-in confirmation flow; anon users are bridged through
  //     /signup?next= by the middleware (proxy.ts) so the token
  //     survives signup. Only available when a campground_qr_tokens
  //     row exists.
  const guestHubUrl = `${siteUrl}/campground/${campground.slug}`
  const camperConnectionUrl = tokenRow
    ? `${siteUrl}/checkin?token=${tokenRow.token}`
    : null

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="QR codes"
        title="Two QR codes for your campground"
        subtitle="One for the front desk (no login). One optional for camper connection."
      />
      <OwnerQrPanel
        campgroundId={campground.id}
        campgroundName={campground.name}
        token={tokenRow?.token ?? null}
        rotatedAt={tokenRow?.rotated_at ?? null}
        guestHubUrl={guestHubUrl}
        camperConnectionUrl={camperConnectionUrl}
      />
    </div>
  )
}

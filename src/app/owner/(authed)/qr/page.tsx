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

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="QR code"
        title="Print and post at your entrance"
        subtitle="Guests scan this and check in for 24 hours."
      />
      <OwnerQrPanel
        campgroundId={campground.id}
        campgroundName={campground.name}
        token={tokenRow?.token ?? null}
        rotatedAt={tokenRow?.rotated_at ?? null}
        checkInUrl={
          tokenRow
            ? `${siteUrl}/campground/${campground.slug}?token=${tokenRow.token}`
            : null
        }
      />
    </div>
  )
}

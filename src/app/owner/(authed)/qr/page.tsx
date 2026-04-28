import { OwnerQrPanel } from '@/components/owner/owner-qr-panel'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

  const supabase = await createSupabaseServerClient()
  const { data: tokenRow } = await supabase
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
        checkInUrl={tokenRow ? `${siteUrl}/checkin?token=${tokenRow.token}` : null}
      />
    </div>
  )
}

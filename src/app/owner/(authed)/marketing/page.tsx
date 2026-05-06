import { MarketingKit } from '@/components/owner/marketing-kit'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { loadOwnerCampground } from '../_helpers'

// Owner Marketing Kit. Bundles every brand-correct, owner-customised
// asset an owner could want to promote RoadWave to their guests:
// counter card PDF, QR PNG, QR PDF, email signature, welcome-email
// template, and door-hanger / site card PDF — all auto-populated with
// the campground's own name, location, logo, and QR token.

export default async function OwnerMarketingPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <PageHeading
        eyebrow="Marketing kit"
        title="No campground linked"
        subtitle="Refresh, or contact support if this persists."
      />
    )
  }

  // campground_qr_tokens has RLS enabled with no policies — only
  // service_role can read it. Ownership has already been verified by
  // loadOwnerCampground (campground_admins join), so it's safe to use
  // the admin client here to fetch the token. Same fix as /owner/qr.
  const admin = createSupabaseAdminClient()
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('token')
    .eq('campground_id', campground.id)
    .maybeSingle<{ token: string }>()

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  const checkInUrl = tokenRow
    ? `${siteUrl}/campground/${campground.slug}?token=${tokenRow.token}`
    : null

  const where = [campground.city, campground.region]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Marketing kit"
        title="Your Marketing Kit"
        subtitle="Everything you need to promote RoadWave to your guests — already customized for your campground."
      />
      <MarketingKit
        campgroundName={campground.name}
        location={where}
        logoUrl={campground.logo_url}
        slug={campground.slug}
        siteUrl={siteUrl}
        checkInUrl={checkInUrl}
        amenities={campground.amenities ?? []}
      />
    </div>
  )
}

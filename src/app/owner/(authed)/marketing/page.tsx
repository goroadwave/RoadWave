import { MarketingKit } from '@/components/owner/marketing-kit'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

  // Same shape as /owner/qr — pull the active QR token via the RLS
  // server client so a campground that doesn't have one yet renders the
  // empty-state nudge in MarketingKit instead of a broken QR.
  const supabase = await createSupabaseServerClient()
  const { data: tokenRow } = await supabase
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
      />
    </div>
  )
}

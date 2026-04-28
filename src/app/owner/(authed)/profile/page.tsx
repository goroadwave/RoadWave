import { PageHeading } from '@/components/ui/page-heading'
import { OwnerProfileForm } from '@/components/owner/owner-profile-form'
import { loadOwnerCampground } from '../_helpers'

export default async function OwnerProfilePage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <div className="space-y-3">
        <PageHeading
          eyebrow="Campground profile"
          title="No campground linked"
          subtitle="Refresh, or contact support if this persists."
        />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Campground profile"
        title="Tell guests where they are"
        subtitle="This appears on the welcome screen after a guest scans your QR."
      />
      <OwnerProfileForm campground={campground} />
    </div>
  )
}

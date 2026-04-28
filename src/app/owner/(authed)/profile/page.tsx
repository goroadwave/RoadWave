import { CampgroundRecoveryForm } from '@/components/owner/campground-recovery-form'
import { OwnerProfileForm } from '@/components/owner/owner-profile-form'
import { PageHeading } from '@/components/ui/page-heading'
import { loadOwnerCampground } from '../_helpers'

export default async function OwnerProfilePage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <div className="space-y-6">
        <PageHeading
          eyebrow="Campground profile"
          title="Let's finish setting up"
          subtitle="Looks like signup didn't quite finish provisioning your campground."
        />
        <CampgroundRecoveryForm />
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

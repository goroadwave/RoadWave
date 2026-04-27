import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile/profile-form'
import { PageHeading } from '@/components/ui/page-heading'
import { INTERESTS } from '@/lib/constants/interests'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ProfileSetupPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: myInterests } = await supabase
    .from('profile_interests')
    .select('interest_id')
    .eq('profile_id', user.id)

  const interestIds = (myInterests ?? []).map((r) => r.interest_id)
  const { data: interestRows } =
    interestIds.length > 0
      ? await supabase.from('interests').select('slug').in('id', interestIds)
      : { data: [] as { slug: string }[] }

  const interestSlugs = (interestRows ?? []).map((r) => r.slug)

  return (
    <div className="max-w-xl space-y-7">
      <PageHeading
        eyebrow="Your profile"
        title="Tell campers about you"
        subtitle="Share what you want. Skip what you don't."
      />
      <ProfileForm
        profile={profile}
        interests={INTERESTS as unknown as { slug: string; label: string; emoji: string }[]}
        myInterestSlugs={interestSlugs}
      />
    </div>
  )
}

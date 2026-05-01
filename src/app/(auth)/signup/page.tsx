import { redirect } from 'next/navigation'
import { SignupCard } from '@/components/auth/signup-card'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function SignupPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Welcome to RoadWave"
        title="Create your account"
        subtitle="Connections without the surveillance."
        compact
      />
      <p className="rounded-xl border border-flame/25 bg-flame/[0.05] px-4 py-3 text-sm text-cream/90 leading-relaxed">
        RoadWave is privacy-first. We do not require exact site numbers.
        Your check-in is temporary. You control visibility. RoadWave is 18+
        only.
      </p>
      <div className="rounded-xl border border-flame/20 bg-flame/[0.04] px-4 py-4 space-y-1.5">
        <h2 className="font-display text-base font-semibold text-cream">
          What happens after you join?
        </h2>
        <p className="text-sm text-cream/85 leading-relaxed">
          You&apos;ll be part of the early RoadWave launch list. As campground
          pages go live, you&apos;ll be able to check in privately, choose your
          visibility, find shared interests, and open a private hello only
          after a mutual wave.
        </p>
      </div>
      <SignupCard />
    </div>
  )
}

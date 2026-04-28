import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/signup-form'
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
      <SignupForm />
    </div>
  )
}

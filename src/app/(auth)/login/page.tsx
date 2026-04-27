import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Welcome back"
        title="Sign in"
        subtitle="Pick up where you parked."
        compact
      />
      <LoginForm />
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerSignupForm } from '@/components/owner/owner-signup-form'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function OwnerSignupPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/owner')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-4xl" wordmark />
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-white/5 bg-card p-6 shadow-2xl shadow-black/50">
        <div className="space-y-1.5 mb-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
            For campground owners
          </p>
          <h1 className="font-display text-2xl font-extrabold text-cream">
            Set up your campground
          </h1>
          <p className="text-xs text-mist">
            We&apos;ll create your account and your campground&apos;s page.
          </p>
        </div>
        <OwnerSignupForm />
      </main>
    </div>
  )
}

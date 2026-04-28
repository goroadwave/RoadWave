import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerNav } from '@/components/owner/owner-nav'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AuthedOwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/owner/login')
  if (!user.email_confirmed_at) redirect('/verify')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role === 'guest') redirect('/checkin')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-night/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3 h-14">
          <Link href="/owner/dashboard" className="inline-block">
            <Logo className="text-2xl" />
          </Link>
          <form action="/auth/sign-out?next=/owner/login" method="post">
            <button
              type="submit"
              className="text-sm text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <OwnerNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}

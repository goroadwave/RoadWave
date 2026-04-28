import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppNav } from '@/components/ui/app-nav'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!user.email_confirmed_at) redirect('/verify')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-night/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3 h-14">
          <Link href="/home" className="inline-block">
            <Logo className="text-2xl" />
          </Link>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-sm text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <AppNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}

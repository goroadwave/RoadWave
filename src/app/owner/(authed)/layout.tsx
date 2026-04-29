import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerNav } from '@/components/owner/owner-nav'
import { OwnerFooter } from '@/components/ui/owner-footer'
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
    .select('role, suspended_at')
    .eq('id', user.id)
    .single()
  if (profile?.suspended_at) redirect('/suspended')
  if (profile?.role === 'guest') redirect('/checkin')

  // OAuth signups arrive here without a campground link. Route them through
  // the onboarding flow before they can hit the dashboard / nav surfaces.
  const { data: link } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!link) redirect('/owner/setup')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-night/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3 h-14">
          {/* Inlined logo with explicit hex colors. The shared Logo component
              was rendering with the wrong color on this page in production
              (likely a Tailwind utility-class cascade quirk specific to the
              owner layout). Hardcoding via `style` bypasses class ordering
              entirely and guarantees the brand colors. */}
          <Link
            href="/owner/dashboard"
            className="inline-block font-display font-extrabold tracking-[-0.02em] leading-none text-2xl whitespace-nowrap"
            aria-label="RoadWave"
          >
            <span data-owner-logo="road" style={{ color: '#f5ecd9' }}>
              Road
            </span>
            <span
              data-owner-logo="wave"
              className="whitespace-nowrap"
              style={{ color: '#f59e0b' }}
            >
              Wave
              <span
                data-owner-logo="wave"
                className="wave-emoji select-none"
                aria-hidden
                style={{ color: '#f59e0b' }}
              >
                👋
              </span>
            </span>
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
      <OwnerFooter />
    </div>
  )
}

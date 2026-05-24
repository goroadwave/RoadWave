import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadOwnerMemberships } from './_helpers'
import { OWNER_CAMPGROUND_COOKIE } from './_constants'
import { OwnerCampgroundSwitcher } from '@/components/owner/owner-campground-switcher'
import { OwnerMessageToaster } from '@/components/owner/owner-message-toaster'
import { OwnerNav } from '@/components/owner/owner-nav'
import { OwnerSupportChat } from '@/components/support/owner-support-chat'
import { OwnerTourOverlay } from '@/components/support/owner-tour-overlay'
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

  // Consent gate: defense-in-depth, same as the (app) layout. First-time
  // OAuth owners flow through /auth/callback → /consent → /owner/setup,
  // but if anything bypasses that, we send them back to /consent with
  // next pointing at the owner dashboard.
  const { data: ackRow } = await supabase
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!ackRow) redirect('/consent?next=/owner')

  // OAuth signups arrive here without a campground link. Route them through
  // the onboarding flow before they can hit the dashboard / nav surfaces.
  //
  // IMPORTANT: do NOT use .maybeSingle() here. A user can legitimately have
  // multiple campground_admins rows (one per campground they manage), and
  // .maybeSingle() silently returns null when more than one row matches.
  // That null was bouncing established owners back to /owner/setup, where
  // each form submission added yet another admin row — an unbounded loop.
  const { data: links } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .limit(1)
  if (!links || links.length === 0) redirect('/owner/setup')

  // Multi-campground awareness for the header switcher. Cheap query
  // (one row per campground the owner manages). The cookie value
  // tells us which campground the dashboard is currently pinned to;
  // loadOwnerCampground() in _helpers.ts validates the same cookie
  // server-side before resolving data, so the two stay in sync.
  const memberships = await loadOwnerMemberships()
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(OWNER_CAMPGROUND_COOKIE)?.value ?? null
  const validCookie =
    cookieVal && memberships.some((m) => m.campground_id === cookieVal)
      ? cookieVal
      : null
  const activeCampgroundId = validCookie ?? memberships[0]?.campground_id ?? null

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
          <div className="flex items-center gap-3 min-w-0">
            {/* Switcher renders nothing if no memberships, a static
                "Viewing: <name>" if exactly one, or a real dropdown
                if more than one. Multi-campground owners get a
                one-tap way to change the active campground from any
                owner page; the cookie + loadOwnerCampground() keep
                every subsequent page render in sync. */}
            <OwnerCampgroundSwitcher
              memberships={memberships}
              currentCampgroundId={activeCampgroundId}
            />
            {/* Owner sign-out lands on /owner/login (not the camper-
                focused homepage at /). An owner who signed out from
                the owner side expects to see the owner login, not
                "Camper QR scanner" hero copy. */}
            <form action="/auth/sign-out?next=/owner/login" method="post">
              <button
                type="submit"
                className="text-sm text-mist hover:text-cream underline-offset-2 hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <OwnerNav />
      {/* Bottom padding reserves space under the floating Riley FAB
          (fixed bottom-right ~60×60px) so the last action button on
          /owner/marketing, /owner/qr, etc. isn't covered on phones. */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 pb-28 sm:pb-12">
        {children}
      </main>
      <OwnerSupportChat />
      <OwnerTourOverlay />
      {/* New-message toast notifier. Polls /api/owner/message-counts
          and fires a toast on a fresh increment. Renders nothing
          until a new message arrives. Sound is opt-in via the
          OwnerMessageSoundToggle (defaults off). */}
      <OwnerMessageToaster />
    </div>
  )
}

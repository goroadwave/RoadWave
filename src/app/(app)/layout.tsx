import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppLantern } from '@/components/lantern/app-lantern'
import { GuestSupportChat } from '@/components/support/guest-support-chat'
import { TourOverlay } from '@/components/support/tour-overlay'
import { AppNav } from '@/components/ui/app-nav'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Phase E (2026-05-21): the pending_checkin_token cookie bridge that
// used to redirect authed campers into /checkin from this layout is
// gone. The campground hub at /campground/<slug> is now the post-auth
// landing for campers arriving from a QR scan, and the hub itself
// upserts presence + renders the Camper Connections layer. The proxy
// still sets the cookie on /campground/<slug>?token=<uuid> for older
// /checkin?token=... fallback paths, but the (app) shell no longer
// consumes it -- nothing here should redirect a camper away from the
// page they just asked for.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!user.email_confirmed_at) redirect('/verify')

  // Suspension gate: if profiles.suspended_at is set, the account can't use
  // the app. Send them to /suspended where they can sign out or appeal.
  // We also pull is_admin in the same round-trip so the founder admin
  // link can be conditionally rendered in the header.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('suspended_at, is_admin, privacy_mode')
    .eq('id', user.id)
    .maybeSingle()
  if (profileRow?.suspended_at) redirect('/suspended')
  const isAdmin = profileRow?.is_admin === true
  const currentPrivacyMode = (profileRow?.privacy_mode ?? 'visible') as
    | 'visible'
    | 'quiet'
    | 'invisible'
    | 'campground_updates_only'

  // Active-check-in flag for the AppNav's "Updates Only" 8th tab. The
  // tab is a one-tap privacy flip into Campground Updates Only mode and
  // only makes sense for a guest who's currently checked into a
  // campground (otherwise there's nothing for the mode to gate updates
  // from). Same canonical "active and not expired" shape used in /home,
  // /nearby, and /meetups.
  const { data: activeCheckIn } = await supabase
    .from('check_ins')
    .select('id')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()
  const hasActiveCheckIn = !!activeCheckIn

  // Consent gate: every user must have a legal_acks row before reaching
  // the app. Email signups land one at signup; OAuth users go through
  // /consent on their first sign-in. This block is defense-in-depth in
  // case anyone bypasses /auth/callback.
  const { data: ackRow } = await supabase
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!ackRow) redirect('/consent?next=/home')

  // Riley is the single entry point for both the in-page tour and the
  // chat panel. Both UI components mount here in (app); the providers
  // themselves live in the root layout so Riley's button (also at the
  // root) can read and drive their state. GuestSupportChat and
  // TourOverlay register their presence on mount, which is how Riley
  // can tell the difference between an (app) surface (open the panel
  // directly) and a marketing surface (fall back to /home or /tour).

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-night/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3 h-14">
          <Link href="/home" className="inline-block">
            <Logo className="text-2xl" />
          </Link>
          <div className="flex items-center gap-3">
            <AppLantern />
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
              >
                Admin
              </Link>
            )}
            <form action="/auth/sign-out?next=/" method="post">
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
      <AppNav
        showUpdatesOnly={hasActiveCheckIn}
        currentPrivacyMode={currentPrivacyMode}
      />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
      <GuestSupportChat />
      <TourOverlay />
    </div>
  )
}

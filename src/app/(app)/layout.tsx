import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppLantern } from '@/components/lantern/app-lantern'
import { GuestSupportChat } from '@/components/support/guest-support-chat'
import { GuestSupportProvider } from '@/components/support/guest-support-context'
import { TourProvider } from '@/components/support/tour-context'
import { TourOverlay } from '@/components/support/tour-overlay'
import { AppNav } from '@/components/ui/app-nav'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Pending check-in bridge — set by the proxy when a guest opens
// /campground/<slug>?token=<uuid>. After the auth + consent gates pass,
// route them straight to /checkin so the welcome → signup → check-in
// flow doesn't drop the token. The proxy clears the cookie when /checkin
// is reached, so this layout-level redirect doesn't loop.
const PENDING_CHECKIN_COOKIE = 'pending_checkin_token'
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    .select('suspended_at, is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (profileRow?.suspended_at) redirect('/suspended')
  const isAdmin = profileRow?.is_admin === true

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

  // Resume the camper's pending check-in if they came in via a campground
  // welcome page. The proxy clears this cookie on /checkin so we won't
  // loop here; we still validate the value before trusting it.
  const jar = await cookies()
  const pendingCheckin = jar.get(PENDING_CHECKIN_COOKIE)?.value
  if (pendingCheckin && UUID_RE.test(pendingCheckin)) {
    redirect(`/checkin?token=${pendingCheckin}`)
  }

  // Riley is now the single entry point for both the in-page tour
  // and the chat panel. Both are surfaced from the (app) layout (which
  // already enforces auth, email confirmation, and consent), regardless
  // of whether the visitor has an active check-in. The previous
  // active-check-in gate is intentionally removed so prospective and
  // pre-check-in users can ask Riley how RoadWave works.

  return (
    <GuestSupportProvider>
      <TourProvider>
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
          <AppNav />
          <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
          <GuestSupportChat />
          <TourOverlay />
        </div>
      </TourProvider>
    </GuestSupportProvider>
  )
}

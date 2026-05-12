import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthDivider, GoogleAuthButton } from '@/components/auth/google-auth-button'
import { OwnerLoginForm } from '@/components/owner/owner-login-form'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function OwnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/owner')

  // When Supabase or our /auth/sign-in confirmation step rejects an
  // expired magic link, the user lands here with ?error=otp_expired
  // (or a verbatim Supabase error message). Show a banner above the
  // sign-in card so they know what happened and what to do next.
  const sp = await searchParams
  const errorBanner = friendlyOwnerLoginError(sp.error)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      {/* Inlined logo with explicit hex colors — same pattern as the
          (authed) owner layout. Bypasses any class-cascade issues that
          made the shared Logo component render Wave in the wrong color. */}
      <Link
        href="/"
        className="mb-8 inline-block font-display font-extrabold tracking-[-0.02em] leading-none text-4xl whitespace-nowrap"
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
      <main className="w-full max-w-md rounded-2xl border border-white/5 bg-card p-6 shadow-2xl shadow-black/50">
        <div className="space-y-1.5 mb-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
            Owner sign in
          </p>
          <h1 className="font-display text-2xl font-extrabold text-cream">
            Welcome back
          </h1>
        </div>
        {errorBanner && (
          <div className="mb-5 rounded-xl border border-flame/30 bg-flame/[0.06] p-3 text-sm text-cream leading-snug">
            {errorBanner}
          </div>
        )}
        <div className="space-y-4">
          <GoogleAuthButton next="/owner" />
          <AuthDivider />
          <OwnerLoginForm />
        </div>
        <p className="mt-4 text-center text-[11px] text-mist/80 leading-snug">
          Just signed up via Stripe? Use the email you paid with — we&apos;ll
          mint a fresh magic link to your inbox.
        </p>
      </main>
    </div>
  )
}

function friendlyOwnerLoginError(code: string | undefined): string | null {
  if (!code) return null
  if (code === 'otp_expired' || /expired|invalid/i.test(code)) {
    return 'That sign-in link has expired — magic links are good for an hour. Enter your email below and we’ll send a fresh one.'
  }
  return code
}

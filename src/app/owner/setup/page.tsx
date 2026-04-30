import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerSetupForm } from '@/components/owner/owner-setup-form'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// /owner/setup is the post-OAuth onboarding page. An owner who signed in
// with Google has an auth.users row but no campground yet; this page
// collects the missing pieces and provisions everything in one shot.
export default async function OwnerSetupPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  // Consent gate: first-time OAuth owners must record consent before
  // provisioning a campground. Defense-in-depth — /auth/callback already
  // sends them through /consent, but if anyone reaches setup directly
  // we bounce them with next pointing back here.
  const { data: ackRow } = await supabase
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!ackRow) redirect('/consent?next=/owner/setup')

  // If they already have a campground, skip setup.
  const { data: existingLink } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existingLink) redirect('/owner/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Best-effort prefill: use whatever the trigger / OAuth metadata captured.
  const initialDisplayName =
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    ''

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-8 inline-block font-display font-extrabold tracking-[-0.02em] leading-none text-4xl whitespace-nowrap"
        aria-label="RoadWave"
      >
        <span style={{ color: '#f5ecd9' }}>Road</span>
        <span className="whitespace-nowrap" style={{ color: '#f59e0b' }}>
          Wave
          <span className="wave-emoji select-none" aria-hidden style={{ color: '#f59e0b' }}>
            👋
          </span>
        </span>
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-white/5 bg-card p-6 shadow-2xl shadow-black/50">
        <div className="space-y-1.5 mb-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
            One last step
          </p>
          <h1 className="font-display text-2xl font-extrabold text-cream">
            Set up your campground
          </h1>
          <p className="text-xs text-mist">
            Tell us about your campground and we&apos;ll spin up your dashboard.
          </p>
        </div>
        <OwnerSetupForm
          initialDisplayName={initialDisplayName}
          ownerEmail={user.email ?? ''}
        />
      </main>
    </div>
  )
}

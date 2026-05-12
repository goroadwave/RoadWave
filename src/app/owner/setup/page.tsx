import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerSetupForm } from '@/components/owner/owner-setup-form'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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

  // If they already manage at least one campground, skip setup.
  //
  // IMPORTANT: use .limit(1) on an array result rather than .maybeSingle().
  // An owner can have multiple campground_admins rows (one per campground
  // they manage), and .maybeSingle() silently returns null when more than
  // one row matches — which previously sent established owners back to
  // this form, and each form submission added another admin row.
  const { data: existingLinks } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', user.id)
    .limit(1)
  if (existingLinks && existingLinks.length > 0) {
    console.info(
      '[owner-setup] user already has a campground link — redirecting to dashboard',
      { user_id_prefix: user.id.slice(0, 8) },
    )
    redirect('/owner/dashboard')
  }

  // Recovery path: no admin link, but a campground exists owned by this
  // user's email (e.g. Stripe webhook created the campground but the
  // admin-link insert failed). Auto-link them to the most recent one
  // and send them to the dashboard instead of forcing them through the
  // setup form, which would create a duplicate campground.
  const ownerEmail = user.email ?? ''
  if (ownerEmail) {
    const admin = createSupabaseAdminClient()
    const { data: orphanCgs } = await admin
      .from('campgrounds')
      .select('id, slug, name')
      .eq('owner_email', ownerEmail)
      .order('created_at', { ascending: false })
      .limit(1)
    const orphanCg = orphanCgs?.[0]
    if (orphanCg) {
      const { error: linkErr } = await admin
        .from('campground_admins')
        .insert({
          campground_id: orphanCg.id,
          user_id: user.id,
          role: 'owner',
        })
      if (!linkErr) {
        console.info('[owner-setup] recovered orphaned campground link', {
          user_id_prefix: user.id.slice(0, 8),
          campground_id_prefix: orphanCg.id.slice(0, 8),
          slug: orphanCg.slug,
        })
        redirect('/owner/dashboard')
      }
      console.warn(
        '[owner-setup] orphan recovery insert failed — falling through to setup form',
        { message: linkErr.message },
      )
    }
  }

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative">
      <form
        action="/auth/sign-out?next=/"
        method="post"
        className="absolute top-4 right-4"
      >
        <button
          type="submit"
          className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          Sign out
        </button>
      </form>
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

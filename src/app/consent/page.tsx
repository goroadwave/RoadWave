import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ConsentForm } from '@/components/consent/consent-form'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'One last step — RoadWave',
  description:
    'Confirm your age and accept the RoadWave terms before continuing.',
  robots: { index: false, follow: false },
}

// First-time OAuth users land here from /auth/callback. Email signups have
// already written a legal_acks row at signup, so they short-circuit straight
// through to next.
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const params = await searchParams
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next
  const next = typeof rawNext === 'string' && rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : '/home'

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/consent?next=' + next)}`)

  // If they've already consented, never re-prompt.
  const { data: existing } = await supabase
    .from('legal_acks')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (existing) redirect(next)

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
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-3xl" />
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/50 space-y-5">
        <div className="space-y-1.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
            One last step
          </p>
          <h1 className="font-display text-2xl font-extrabold text-cream">
            Confirm and accept
          </h1>
          <p className="text-xs text-mist">
            Required for everyone — same rules whether you signed up with email
            or Google.
          </p>
        </div>
        <ConsentForm next={next} userEmail={user.email ?? null} />
        <p className="text-center text-[11px] text-mist/80 leading-snug">
          RoadWave is not for emergencies, background checks, or campground
          security.
        </p>
      </main>
    </div>
  )
}

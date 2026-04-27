import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    if (!user.email_confirmed_at) redirect('/verify')
    redirect('/home')
  }

  // Unauthed visitors see the landing hero.
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Logo className="text-2xl" />
        <Link
          href="/login"
          className="text-sm font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </header>

      <main className="px-4 pt-10 pb-12 sm:pt-16 sm:pb-20">
        <div className="w-full max-w-xl mx-auto text-center space-y-6">
          <Eyebrow>Made for the campground</Eyebrow>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
            Pull into camp.
            <br />
            Find your people.
          </h1>

          <div className="space-y-1">
            <p className="font-serif italic text-flame text-xl sm:text-2xl leading-snug">
              Coffee at sunrise. Campfire at dusk. New friends at the next site over.
            </p>
            <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
              Wave when the vibe&apos;s right. Stay parked when it isn&apos;t.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              Get started <span aria-hidden>👋</span>
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
            >
              See How It Works <span aria-hidden>→</span>
            </Link>
          </div>

          <p className="pt-2 text-sm text-mist">
            Take a quick tour — the demo runs on mock data, no signup needed.
          </p>
        </div>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-mist/70">
        <p>Privacy-first campground connections for RVers.</p>
      </footer>
    </>
  )
}

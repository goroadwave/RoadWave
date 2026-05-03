import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

// Friendly 404 for /campground/<slug> when the slug doesn't resolve to
// a real campground row (or the campground is marked is_active=false).
// Triggered by the page calling notFound() from next/navigation.

export default function CampgroundNotFound() {
  return (
    <main className="min-h-screen bg-night text-cream flex flex-col">
      <header className="px-4 py-5">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
      </header>

      <section className="flex-1 px-4 py-16 sm:py-24 flex items-center">
        <div className="mx-auto max-w-xl text-center space-y-5">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-flame font-semibold">
            Not on RoadWave yet
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">
            This campground hasn&rsquo;t activated RoadWave yet.
          </h1>
          <p className="text-mist text-base sm:text-lg leading-relaxed">
            If you&rsquo;re the owner, you can spin up your branded guest page
            in a few minutes. Already a guest looking for a campground that
            does have RoadWave? Try the demo to see what one looks like.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/start"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
            >
              Activate my campground
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-6 py-3 font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
            >
              Try the Demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

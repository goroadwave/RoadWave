import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'
import { OwnerPilotForm } from '@/components/owner/owner-pilot-form'

export const metadata: Metadata = {
  title: 'Start Your Campground Pilot — RoadWave',
  description:
    'Set up your RoadWave QR guest hub. A short intake form — a real human follows up within one business day.',
}

// Action-focused pilot intake page. Intentionally NOT another long
// marketing page — /owners is the explanation page. This is the
// "I'm ready, take my info" step that the /owners CTAs and the
// footer "Start a Campground Pilot" link both lead to.

export default function OwnersStartPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-2xl" />
        </Link>
        <nav>
          <ul className="flex items-center gap-4 sm:gap-6 text-sm">
            <li>
              <Link
                href="/owners"
                className="text-mist hover:text-cream transition-colors"
              >
                Why RoadWave?
              </Link>
            </li>
            <li>
              <Link
                href="/demo"
                className="text-mist hover:text-cream transition-colors"
              >
                Demo
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-mist hover:text-cream transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="px-4 pt-8 pb-16 sm:pt-12 sm:pb-24">
        <div className="mx-auto max-w-xl space-y-8">
          <div className="text-center space-y-3">
            <Eyebrow>Pilot intake</Eyebrow>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Start Your Campground Pilot
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Set up your RoadWave QR guest hub so guests can see
              updates, contact the office, leave reviews, book again,
              and connect when they want to.
            </p>
          </div>

          <OwnerPilotForm />

          <p className="text-center text-[11px] text-mist/70 leading-snug">
            Looking for the explanation page first?{' '}
            <Link
              href="/owners"
              className="text-flame underline-offset-2 hover:underline"
            >
              See RoadWave for campgrounds →
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}

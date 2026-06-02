import Link from 'next/link'
import { DemoOwnerHub } from '@/components/demo/demo-owner-hub'

// Phase 3 of the RoadWave Demo Center. Standalone owner dashboard
// demo under /demo-center/owner. Everything renders from the
// DemoOwnerHub client component using local mock data -- no DB,
// no auth, no real writes, no Stripe, no real emails.
//
// The real /owner/(authed)/dashboard route stays untouched and
// fully gated by the auth layout. This page is the public sales
// equivalent that prospects can browse without signing in.

export const metadata = {
  title: 'Owner Dashboard Demo · RoadWave',
  description:
    'Inside the RoadWave owner dashboard: bulletins, meetups, weather alerts, office messages, reviews, rebooking, and a high-level Camper Connections summary.',
  alternates: { canonical: '/demo-center/owner' },
}

export default function DemoOwnerPage() {
  return (
    <main className="flex-1">
      <DemoOwnerHub />

      <div className="mx-auto max-w-4xl px-4 pb-12 pt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Link
          href="/demo-center"
          className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Back to Demo Center
        </Link>
        <Link
          href="/demo-center/camper"
          className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline sm:ml-4"
        >
          See the camper side →
        </Link>
        <Link
          href="/owners/start"
          className="ml-auto inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold trial-cta"
        >
          Start Free 30-Day Trial →
        </Link>
      </div>
    </main>
  )
}

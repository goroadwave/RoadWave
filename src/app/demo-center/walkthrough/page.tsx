import Link from 'next/link'
import { DemoWalkthrough } from '@/components/demo/demo-walkthrough'

// Phase 4 of the RoadWave Demo Center. Self-guided product tour under
// /demo-center/walkthrough. Everything renders from the DemoWalkthrough
// client component using local mock data -- no DB, no auth, no real
// writes, no Stripe, no real emails.
//
// The interactive /demo-center/camper and /demo-center/owner demos and
// the existing /demo + /demo/[slug] routes all stay untouched; this
// page links out to them as the "now try it yourself" follow-up.

export const metadata = {
  title: 'Guided Walkthrough · RoadWave',
  description:
    'A self-guided, step-by-step tour of RoadWave for campground owners: setup, the owner dashboard, the camper QR experience, and optional Camper Connections — all on demo data.',
}

export default function DemoWalkthroughPage() {
  return (
    <main className="flex-1">
      <DemoWalkthrough />

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
      </div>
    </main>
  )
}

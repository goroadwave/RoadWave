import Link from 'next/link'
import { DemoCamperHub } from '@/components/demo/demo-camper-hub'

// Phase 2 of the RoadWave Demo Center. Standalone camper QR
// experience under /demo-center/camper. Everything renders from
// the DemoCamperHub client component using local mock data --
// no DB, no auth, no real writes.
//
// The existing interactive Wave demo at /demo (src/pages/demo.jsx)
// stays untouched. This route is the polished single-page
// equivalent that uses the same visual primitives as the real
// /campground/[slug] guest hub.

export const metadata = {
  title: 'Camper Demo · RoadWave',
  description:
    'What a camper sees after scanning your campground’s RoadWave QR code: Wi-Fi, map, bulletins, meetups, weather alerts, office messages, and optional Camper Connections.',
}

export default function DemoCamperPage() {
  return (
    <main className="flex-1">
      <DemoCamperHub />

      {/* Footer return link so the visitor can always get back to
          the Demo Center hub without using the browser back button. */}
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Link
          href="/demo-center"
          className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Back to Demo Center
        </Link>
        <Link
          href="/owner/signup"
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
        >
          Start your 30-day trial →
        </Link>
      </div>
    </main>
  )
}

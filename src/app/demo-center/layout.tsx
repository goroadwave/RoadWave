import { DemoModeBanner } from '@/components/demo/demo-mode-banner'

// Layout for the RoadWave Demo Center -- the polished sales hub at
// /demo-center. Wraps every demo-center subpage in the persistent
// "Demo Mode" banner so visitors always know they're not touching
// real data.
//
// Deliberately separate from /demo (the existing Pages Router
// interactive Wave demo at src/pages/demo.jsx) and from
// /demo/[campground] (the saved-demo viewer at
// src/app/demo/[campground]/page.tsx). Both of those keep working
// untouched; the Demo Center links into the former as the "full
// interactive camper experience" CTA.

export default function DemoCenterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoModeBanner />
      {children}
    </div>
  )
}

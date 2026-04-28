'use client'

import { RileyTour } from '@/components/tour/riley-tour'

export default function TourPage() {
  return (
    <main className="min-h-screen bg-night text-cream font-sans flex flex-col">
      <RileyTour showExit enableKeyboard />
    </main>
  )
}

'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Owner Riley's in-page tour. Mirrors the camper TourProvider but
// with owner-flavoured steps mapped to the dashboard nav. Phase 2
// (April 2026) extended it to cover the Engagement Hub toggles and
// the Messages inbox. The Provider is in the root layout;
// OwnerTourOverlay mounts inside /owner/(authed)/ layout and
// registers via useOwnerTourRegister so Riley's button can tell when
// to start the in-page tour vs. fall back to a route.

export type OwnerTourCtx = {
  mounted: boolean
  setMounted: (mounted: boolean) => void
  activeStep: number | null
  start: () => void
  next: () => void
  prev: () => void
  stop: () => void
}

const defaultCtx: OwnerTourCtx = {
  mounted: false,
  setMounted: () => {},
  activeStep: null,
  start: () => {},
  next: () => {},
  prev: () => {},
  stop: () => {},
}

const OwnerTourContext = createContext<OwnerTourCtx>(defaultCtx)

export function useOwnerTour(): OwnerTourCtx {
  return useContext(OwnerTourContext)
}

export function useOwnerTourRegister() {
  const { setMounted } = useContext(OwnerTourContext)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [setMounted])
}

export const OWNER_TOUR_STEPS = [
  {
    icon: '🏕️',
    title: 'Profile',
    body: "Set up your campground identity — name, location, logo, and amenities. This is also where you paste your Google Review URL and Book Again URL (plus optional booking message and promo code).",
  },
  {
    icon: '🔳',
    title: 'QR',
    body: "Grab your unique QR code. Download as PNG or PDF, or regenerate if needed. Every guest scan starts here.",
  },
  {
    icon: '🎚️',
    title: 'Guest features',
    body: "On the Home tab, flip toggles for Stay Feedback (Pulse Check), Leave a Google Review, Recommend Us on Facebook, Book Your Next Stay, and Contact the Office. Anything off is hidden from guests entirely.",
  },
  {
    icon: '📨',
    title: 'Messages',
    body: "Guest inbox — every Pulse 'needs attention' note and Contact the Office submission lands here. Email me new messages toggle controls Resend alerts.",
  },
  {
    icon: '📌',
    title: 'Bulletin',
    body: "Post updates your guests see — quiet hours, weather, events, anything you want to broadcast that day.",
  },
  {
    icon: '📊',
    title: 'Stats',
    body: "Check-in counts, weekly summary, and guest engagement so you can see how RoadWave is performing at your property.",
  },
] as const

export function OwnerTourProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMountedState] = useState(false)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const setMounted = useCallback((m: boolean) => setMountedState(m), [])
  return (
    <OwnerTourContext.Provider
      value={{
        mounted,
        setMounted,
        activeStep,
        start: () => setActiveStep(0),
        next: () =>
          setActiveStep((s) =>
            s === null ? null : Math.min(s + 1, OWNER_TOUR_STEPS.length - 1),
          ),
        prev: () =>
          setActiveStep((s) => (s === null ? null : Math.max(s - 1, 0))),
        stop: () => setActiveStep(null),
      }}
    >
      {children}
    </OwnerTourContext.Provider>
  )
}

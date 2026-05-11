'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Owner Riley's 5-step in-page tour. Mirrors the camper TourProvider
// but with owner-flavoured steps mapped to the dashboard nav
// (Profile → QR → Marketing → Bulletin → Stats). The Provider is in
// the root layout; OwnerTourOverlay mounts inside /owner/(authed)/
// layout and registers via useOwnerTourRegister so Riley's button
// can tell when to start the in-page tour vs. fall back to a route.

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
    body: "Set up your campground identity — name, location, logo, and amenities. This is what shows up to guests after they scan.",
  },
  {
    icon: '🔳',
    title: 'QR',
    body: "Grab your unique QR code. Download as PNG or PDF, or regenerate if needed. Every check-in starts here.",
  },
  {
    icon: '📣',
    title: 'Marketing',
    body: "Downloadable assets to drive scans: counter cards, posters, email signatures, welcome emails. Everything brand-ready.",
  },
  {
    icon: '📌',
    title: 'Bulletin',
    body: "Post updates your guests see — quiet hours, weather, events, anything you want to broadcast that day.",
  },
  {
    icon: '📊',
    title: 'Stats',
    body: "Check-in counts and guest engagement so you can see how RoadWave is performing at your property.",
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

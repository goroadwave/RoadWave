'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Riley's in-page tour: a 5-step guided walkthrough of the (app) nav.
// The Provider is mounted at the root layout so Riley's button (which
// also lives at the root) can read state from it. The actual UI
// (TourOverlay) is mounted inside the (app) layout and registers
// itself via useTourRegister() so the button can tell whether the
// overlay is available on the current surface or whether to fall back
// to a /tour route navigation.

export type TourCtx = {
  /** True iff a TourOverlay is currently in the React tree. */
  mounted: boolean
  /** Used internally by TourOverlay to register/unregister. */
  setMounted: (mounted: boolean) => void
  /** 0-indexed step number, or null when the tour isn't running. */
  activeStep: number | null
  start: () => void
  next: () => void
  prev: () => void
  stop: () => void
}

const defaultCtx: TourCtx = {
  mounted: false,
  setMounted: () => {},
  activeStep: null,
  start: () => {},
  next: () => {},
  prev: () => {},
  stop: () => {},
}

const TourContext = createContext<TourCtx>(defaultCtx)

export function useTour(): TourCtx {
  return useContext(TourContext)
}

export function useTourRegister() {
  const { setMounted } = useContext(TourContext)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [setMounted])
}

export const TOUR_STEPS = [
  {
    icon: '📷',
    title: 'Check in',
    body: "Scan your campground's QR code to start a 24-hour session. You're visible for one day, then invisible again.",
  },
  {
    icon: '👋',
    title: 'Campers Here',
    body: 'See who else is checked in right now. Shared interests show up first — no exact site numbers, just vibe.',
  },
  {
    icon: '🔥',
    title: 'Meetups',
    body: "What's happening at the campground tonight — coffee, campfires, pickleball. Join one or skip them all.",
  },
  {
    icon: '🤝',
    title: 'Waves',
    body: "Say hello with a tap. A private chat only opens when you've both waved at each other.",
  },
  {
    icon: '🔒',
    title: 'Privacy',
    body: 'Visible, Quiet, Invisible, or Updates Only — pick one. Switch any time. No one is notified.',
  },
] as const

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMountedState] = useState(false)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const setMounted = useCallback((m: boolean) => setMountedState(m), [])
  return (
    <TourContext.Provider
      value={{
        mounted,
        setMounted,
        activeStep,
        start: () => setActiveStep(0),
        next: () =>
          setActiveStep((s) =>
            s === null ? null : Math.min(s + 1, TOUR_STEPS.length - 1),
          ),
        prev: () =>
          setActiveStep((s) => (s === null ? null : Math.max(s - 1, 0))),
        stop: () => setActiveStep(null),
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

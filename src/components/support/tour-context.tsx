'use client'

import { createContext, useContext, useState } from 'react'

// Riley's in-page tour: a 5-step guided walkthrough of the (app) nav
// (Check in, Campers Here, Meetups, Waves, Privacy). The provider
// lives in the (app) layout; the floating Riley button reads
// useTour() to decide whether to expose the "Take a Tour" entry, and
// the TourOverlay component reads the active step to drive the UI.
//
// `mounted` lets a consumer outside the provider tell the difference
// between "no tour is active" and "tour is not even available on this
// surface." Riley uses that to fall back to a /tour route navigation
// on marketing pages where the (app) nav doesn't exist.

export type TourCtx = {
  /** True when the real provider is up the tree. False when reading
   *  the default value because no provider is mounted (e.g. /demo,
   *  /, marketing pages). */
  mounted: boolean
  /** 0-indexed step number, or null when the tour isn't running. */
  activeStep: number | null
  start: () => void
  next: () => void
  prev: () => void
  stop: () => void
}

const defaultCtx: TourCtx = {
  mounted: false,
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
  const [activeStep, setActiveStep] = useState<number | null>(null)
  return (
    <TourContext.Provider
      value={{
        mounted: true,
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

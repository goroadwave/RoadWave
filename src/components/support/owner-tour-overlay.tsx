'use client'

import { useEffect } from 'react'
import {
  OWNER_TOUR_STEPS,
  useOwnerTour,
  useOwnerTourRegister,
} from './owner-tour-context'

// Owner Riley's in-page tour overlay. Mounts inside the /owner/
// (authed) layout and registers its presence to the OwnerTour
// Provider so Riley's button can tell whether to start the in-page
// tour or fall back to /owner/dashboard.

export function OwnerTourOverlay() {
  useOwnerTourRegister()
  const { mounted, activeStep, next, prev, stop } = useOwnerTour()

  useEffect(() => {
    if (activeStep === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeStep, stop])

  if (!mounted || activeStep === null) return null

  const step = OWNER_TOUR_STEPS[activeStep]
  const isFirst = activeStep === 0
  const isLast = activeStep === OWNER_TOUR_STEPS.length - 1

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-[80] bg-night/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Owner tour step ${activeStep + 1} of ${OWNER_TOUR_STEPS.length}: ${step.title}`}
        className="fixed z-[90] bottom-24 right-4 left-4 sm:left-auto sm:right-24 sm:bottom-8 sm:max-w-sm rounded-2xl border border-flame/40 bg-card text-cream shadow-2xl shadow-black/60 p-5"
      >
        <button
          type="button"
          onClick={stop}
          aria-label="Close tour"
          className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/20 transition-colors"
        >
          <span aria-hidden className="text-sm leading-none">
            ✕
          </span>
        </button>

        <p className="text-[10px] uppercase tracking-[0.22em] text-flame font-semibold">
          Owner Tour · Riley · Step {activeStep + 1} of {OWNER_TOUR_STEPS.length}
        </p>
        <h3 className="font-display text-xl font-extrabold leading-tight mt-1.5">
          <span aria-hidden className="mr-1.5">
            {step.icon}
          </span>
          {step.title}
        </h3>
        <p className="text-sm text-mist leading-relaxed mt-2">{step.body}</p>

        <div className="flex items-center justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className="rounded-lg border border-white/15 bg-white/5 text-cream px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-1.5" aria-hidden>
            {OWNER_TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={
                  i === activeStep
                    ? 'h-1.5 w-4 rounded-full bg-flame transition-all'
                    : 'h-1.5 w-1.5 rounded-full bg-white/20 transition-all'
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={isLast ? stop : next}
            className="rounded-lg bg-flame text-night px-4 py-2 text-xs font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
          >
            {isLast ? 'Done 👋' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  )
}

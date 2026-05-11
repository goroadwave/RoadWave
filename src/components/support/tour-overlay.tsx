'use client'

import { useEffect } from 'react'
import { TOUR_STEPS, useTour, useTourRegister } from './tour-context'

// In-page tour overlay. Mounted once at the bottom of the (app)
// layout; renders nothing until Riley's "Take a Tour" button starts
// the tour. Then it pins itself above Riley's button in the bottom-
// right with a Riley-flavoured step card: icon + step heading + body
// + Back/Next (or Done on the final step). Esc and the ✕ button
// close it.

export function TourOverlay() {
  // Declare presence to the Provider (mounted in the root layout) so
  // Riley's button can start the in-page tour directly instead of
  // falling back to /tour.
  useTourRegister()
  const { mounted, activeStep, next, prev, stop } = useTour()

  // Esc closes.
  useEffect(() => {
    if (activeStep === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeStep, stop])

  if (!mounted || activeStep === null) return null

  const step = TOUR_STEPS[activeStep]
  const isFirst = activeStep === 0
  const isLast = activeStep === TOUR_STEPS.length - 1

  return (
    <>
      {/* Dim backdrop so the tour reads as a focused mode. Click-outside
          on the backdrop does NOT close — only Esc or the ✕ button —
          to avoid accidental dismissal mid-step. */}
      <div
        aria-hidden
        className="fixed inset-0 z-[80] bg-night/70 backdrop-blur-sm"
      />

      {/* Step card. Positioned bottom-center on phones, anchored above
          Riley's mascot button on >=sm so Riley's mouth points up at
          her own speech bubble. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${activeStep + 1} of ${TOUR_STEPS.length}: ${step.title}`}
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
          Tour · Riley · Step {activeStep + 1} of {TOUR_STEPS.length}
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
            {TOUR_STEPS.map((_, i) => (
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

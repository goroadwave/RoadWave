'use client'

import { useState, useTransition } from 'react'
import { resetDemoCampgroundAction } from '@/app/admin/campgrounds/actions'

// Admin-only button that clears per-run activity on the RoadWave Demo
// Campground (bulletins, meetups, check-ins, events, and the 6 demo
// camper auth users). Slug-scoped — see actions.ts for the guard.
//
// Two-step confirmation: first click flips the button into "Confirm"
// state; second click within 5s actually fires the reset. Cancels back
// to idle if the user does anything else.

export function ResetDemoButton() {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  )

  const armConfirm = () => {
    setResult(null)
    setConfirming(true)
    // Auto-cancel after 5s of no second click.
    window.setTimeout(() => setConfirming(false), 5000)
  }

  const fire = () => {
    setConfirming(false)
    startTransition(async () => {
      const res = await resetDemoCampgroundAction()
      setResult({
        ok: res.ok,
        message: res.ok
          ? 'Demo campground reset. Re-run scripts/seed-demo-campground.mjs --apply locally to repopulate.'
          : (res.error ?? 'Reset failed.'),
      })
    })
  }

  return (
    <div className="space-y-2">
      {!confirming ? (
        <button
          type="button"
          onClick={armConfirm}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg border border-flame/40 bg-flame/10 px-3 py-1.5 text-xs font-semibold text-flame hover:bg-flame/20 disabled:opacity-50"
        >
          {pending ? 'Resetting…' : 'Reset Demo Campground'}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fire}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-flame px-3 py-1.5 text-xs font-bold text-night hover:bg-flame/90 disabled:opacity-50"
          >
            Confirm reset (clears bulletins, meetups, check-ins, demo campers)
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-mist underline-offset-2 hover:text-cream hover:underline"
          >
            Cancel
          </button>
        </div>
      )}
      {result && (
        <p
          className={`text-xs ${result.ok ? 'text-leaf' : 'text-flame'} leading-snug`}
        >
          {result.message}
        </p>
      )}
    </div>
  )
}

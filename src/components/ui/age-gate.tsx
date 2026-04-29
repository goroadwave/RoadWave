'use client'

import { useEffect, useState } from 'react'

// Per-device confirmation stored in localStorage so a confirmed visitor
// doesn't re-prompt on every page load. Clearing site data resets it,
// which is the same as deleting cookies — that's not a "workaround", it's
// the user starting over.
const STORAGE_KEY = 'roadwave:age-18-confirmed'

// Where to send a visitor who taps "Exit". A neutral destination is
// kinder than `about:blank`; google.com is the standard for age gates.
const EXIT_URL = 'https://www.google.com/'

type Props = {
  children: React.ReactNode
}

// Wraps a page so the wrapped content is invisible until the user
// confirms 18+. No skip option, no remember-me toggle: confirm or leave.
export function AgeGate({ children }: Props) {
  // `null` while we're reading localStorage on the client. Renders nothing
  // (avoids flashing the gate for already-confirmed visitors).
  const [confirmed, setConfirmed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setConfirmed(window.localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // Storage access denied (private mode, embedded webview, etc.) —
      // gate the user every time. Better safe than skipped.
      setConfirmed(false)
    }
  }, [])

  function handleContinue() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Ignore — they'll see the gate again next visit, which is correct
      // when persistence isn't available.
    }
    setConfirmed(true)
  }

  function handleExit() {
    window.location.href = EXIT_URL
  }

  // SSR + initial client render: render the children to keep the page
  // shape stable. The overlay below mounts on top of them.
  if (confirmed === true) return <>{children}</>

  return (
    <>
      {/* Render the wrapped content but make it inert + invisible until
          confirmation. aria-hidden so screen readers don't read it
          while the modal is up. */}
      <div aria-hidden style={{ visibility: 'hidden' }}>
        {children}
      </div>
      {confirmed === false && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
          aria-describedby="age-gate-body"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-night/95 backdrop-blur px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/60 space-y-5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
              Age check
            </p>
            <h2
              id="age-gate-title"
              className="font-display text-2xl font-extrabold text-cream"
            >
              RoadWave is for adults 18 and older.
            </h2>
            <p id="age-gate-body" className="text-sm text-mist leading-relaxed">
              By continuing you confirm you are at least 18 years of age.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExit}
                className="rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Exit
              </button>
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

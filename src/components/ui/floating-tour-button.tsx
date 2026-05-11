'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useGuestSupport } from '@/components/support/guest-support-context'
import { useTour } from '@/components/support/tour-context'

// Floating Riley mascot. Single entry point for both the in-page
// tour and the Riley chat panel.
//
// Tapping Riley opens a two-bubble menu pinned above her:
//   🗺️ Take a Tour  → starts the in-page TourOverlay (when mounted
//                     inside the (app) layout) or falls back to
//                     navigating to /tour for non-(app) surfaces.
//   💬 Chat with Riley → opens the GuestSupportChat panel (only
//                     surfaced when the GuestSupportProvider is
//                     mounted, i.e. inside the (app) layout where
//                     auth is enforced).
//
// Tapping Riley again, clicking outside, or Escape dismisses the
// bubbles. The component is hidden on the marketing tour page, the
// campground landing page, auth pages, and the entire owner dashboard.

export function FloatingTourButton() {
  const pathname = usePathname()
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const tour = useTour()
  const guestChat = useGuestSupport()

  // Close the popup whenever the route changes.
  useEffect(() => {
    setShowPopup(false)
  }, [pathname])

  // Click-outside + Escape close the popup.
  useEffect(() => {
    if (!showPopup) return
    function onPointer(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowPopup(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowPopup(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [showPopup])

  // Hide on /tour (a full-page tour lives there), /campgrounds (its
  // own host-pitch Riley with a different popup lives on that page),
  // auth pages, and the entire owner dashboard.
  if (
    !pathname ||
    pathname === '/tour' ||
    pathname === '/campgrounds' ||
    pathname === '/signup' ||
    pathname === '/login' ||
    pathname === '/verify' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/owner')
  ) {
    return null
  }

  // While the in-page tour is running, hide Riley so she doesn't
  // overlap the step card. The TourOverlay handles closing.
  if (tour.activeStep !== null) return null

  // While the Chat with Riley panel is open, hide the mascot — it
  // sits in the same bottom-right corner as the chat input and would
  // overlap it. The chat panel has its own Close (✕) button + Escape
  // handler, so Riley reappears as soon as the panel is dismissed.
  if (guestChat.open) return null

  function handleRileyTap() {
    setShowPopup((prev) => !prev)
  }

  function handleTakeTour() {
    setShowPopup(false)
    if (tour.mounted) {
      tour.start()
    } else {
      // Marketing surfaces (no TourProvider in the tree) — fall back
      // to the standalone /tour route.
      router.push('/tour')
    }
  }

  function handleChatWithRiley() {
    setShowPopup(false)
    if (guestChat.mounted) {
      guestChat.setOpen(true)
    } else {
      // Visitor is on a non-(app) surface (e.g. /, /demo). Send them
      // to /home — the (app) layout will auth-gate and surface the
      // chat once they're signed in.
      router.push('/home')
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3"
    >
      {showPopup && (
        <div
          role="dialog"
          aria-label="Riley menu"
          className="riley-popup relative w-60 rounded-2xl border border-flame/50 bg-night/95 backdrop-blur p-3 shadow-2xl shadow-black/60"
        >
          {/* Tail pointing down to Riley */}
          <span
            aria-hidden
            className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-night border-r border-b border-flame/50"
          />
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTakeTour}
              className="block w-full rounded-lg bg-flame text-night text-left px-3 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              <span aria-hidden className="mr-1.5">
                🗺️
              </span>
              Take a Tour
            </button>
            <button
              type="button"
              onClick={handleChatWithRiley}
              className="block w-full rounded-lg border border-white/15 bg-white/5 text-cream text-left px-3 py-2 text-sm font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
            >
              <span aria-hidden className="mr-1.5">
                💬
              </span>
              Chat with Riley
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleRileyTap}
        aria-label={showPopup ? 'Close Riley menu' : 'Open Riley menu'}
        aria-expanded={showPopup}
        className="riley-fab grid place-items-center rounded-full bg-card border border-flame/40 shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:shadow-[0_0_36px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-100 transition-all"
        style={{ width: 60, height: 60 }}
      >
        {imgError ? (
          <span className="text-2xl leading-none" aria-hidden>
            🏕️
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- onError fallback to emoji needs <img>
          <img
            src="/riley.png"
            alt=""
            width={52}
            height={52}
            className="rounded-full object-cover"
            style={{ width: 52, height: 52 }}
            onError={() => setImgError(true)}
          />
        )}
      </button>
    </div>
  )
}

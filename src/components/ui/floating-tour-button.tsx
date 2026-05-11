'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useGuestSupport } from '@/components/support/guest-support-context'
import { useOwnerSupport } from '@/components/support/owner-support-context'
import { useOwnerTour } from '@/components/support/owner-tour-context'
import { useTour } from '@/components/support/tour-context'

// Floating Riley mascot. One UI, two personas: Camper Riley on the
// guest (app) tree, Owner Riley on the /owner/* dashboard. The same
// mascot button switches which providers it talks to based on the
// current pathname, so each Riley only ever opens her own tour and
// her own chat panel.
//
// Tapping Riley opens a two-bubble menu pinned above her:
//   🗺️ Take a Tour  → starts the audience-appropriate in-page tour
//                     (or routes to /tour as a marketing fallback
//                     when no tour provider is mounted on this
//                     surface).
//   💬 Chat with Riley → opens the audience-appropriate chat panel
//                     (or routes to the audience's dashboard / home
//                     if the chat panel isn't mounted on this
//                     surface).
//
// Tapping Riley again, clicking outside, or Escape dismisses the
// bubbles. The component is hidden on the marketing tour page, the
// campground landing page, auth pages on both sides, and while a
// tour or chat panel is already open.

export function FloatingTourButton() {
  const pathname = usePathname()
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const camperTour = useTour()
  const camperChat = useGuestSupport()
  const ownerTour = useOwnerTour()
  const ownerChat = useOwnerSupport()

  // Audience detection. Owner persona kicks in for the entire
  // /owner/* tree; everything else is the camper persona.
  const isOwnerSurface = pathname?.startsWith('/owner') ?? false
  const tour = isOwnerSurface ? ownerTour : camperTour
  const chat = isOwnerSurface ? ownerChat : camperChat

  // Close the popup whenever the route changes — including when the
  // route changes across the owner/camper boundary, which also flips
  // the audience above.
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

  // Hide on the full-page /tour, the marketing /campgrounds page
  // (which has its own host-pitch Riley with a different popup), and
  // on every auth flow on either side.
  if (
    !pathname ||
    pathname === '/tour' ||
    pathname === '/campgrounds' ||
    pathname === '/signup' ||
    pathname === '/login' ||
    pathname === '/verify' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/owner/login') ||
    pathname.startsWith('/owner/signup')
  ) {
    return null
  }

  // Hide while a tour is running — the step card sits where Riley does.
  if (tour.activeStep !== null) return null

  // Hide while the matching chat panel is open — same bottom-right
  // real estate, would overlap the chat input.
  if (chat.open) return null

  function handleRileyTap() {
    setShowPopup((prev) => !prev)
  }

  function handleTakeTour() {
    setShowPopup(false)
    if (tour.mounted) {
      tour.start()
    } else {
      // Camper marketing surfaces (no TourProvider mounted) fall back
      // to the public /tour page. Owner surfaces outside (authed)
      // (e.g. /owner/setup) fall back to the dashboard, where the
      // owner tour overlay is available.
      router.push(isOwnerSurface ? '/owner/dashboard' : '/tour')
    }
  }

  function handleChatWithRiley() {
    setShowPopup(false)
    if (chat.mounted) {
      chat.setOpen(true)
    } else {
      // Chat panel isn't mounted on this surface. Send the visitor to
      // the right home — the (app) /home for campers, the dashboard
      // for owners — where the panel is available.
      router.push(isOwnerSurface ? '/owner/dashboard' : '/home')
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
          aria-label={isOwnerSurface ? 'Owner Riley menu' : 'Riley menu'}
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
        aria-label={
          showPopup
            ? isOwnerSurface
              ? 'Close Owner Riley menu'
              : 'Close Riley menu'
            : isOwnerSurface
              ? 'Open Owner Riley menu'
              : 'Open Riley menu'
        }
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

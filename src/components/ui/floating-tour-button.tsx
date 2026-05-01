'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { rileyPopupCtaForPath } from '@/lib/ui/riley-popup-cta'

// Per-page Riley narration. Anything not in this map falls through to the
// default. Pathnames are matched exactly; no wildcards.
const SPEECH_BY_PATH: Record<string, string> = {
  '/home':
    "This is your home base. Check in, set your vibe, and see what's happening at your campground.",
  '/nearby':
    "These are the campers near you right now. Send a wave to anyone who looks interesting!",
  '/meetups':
    "Check out what's happening at the campground tonight. Join a meetup or create your own!",
  '/settings/privacy':
    'This is where you control who sees you. Go invisible anytime with one tap.',
  '/crossed-paths':
    'These are people you have camped near before. Your camping history, all in one place.',
}

const DEFAULT_SPEECH =
  "Need help? I am Riley, your RoadWave campground host. Tap Next on the tour to learn more!"

// Floating Riley. Tapping opens a popup with "Take the Tour" / "Got it!"
// AND fires a per-page narration via /api/speak. Tap-outside, Escape, or
// tapping Riley again closes the popup and stops the clip.
export function FloatingTourButton() {
  const pathname = usePathname()
  const [imgError, setImgError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(false)
  }

  // Stop audio + close popup whenever the route changes.
  useEffect(() => {
    return () => {
      stopAudio()
      setShowPopup(false)
    }
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
        stopAudio()
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowPopup(false)
        stopAudio()
      }
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

  // Hide on /tour (Riley already there) and /campgrounds (its own
  // host-pitch Riley with a different popup lives on that page). Also
  // hide on auth pages — Riley shouldn't pop up while someone is signing
  // in or confirming an email. And hide on the entire owner dashboard:
  // Riley is a guest mascot, not part of the operator experience.
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

  const speechText = SPEECH_BY_PATH[pathname] ?? DEFAULT_SPEECH

  async function handleRileyTap() {
    // Toggle: if open, close + stop.
    if (showPopup) {
      setShowPopup(false)
      stopAudio()
      return
    }

    // Open + speak.
    setShowPopup(true)
    setIsPlaying(true)
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText }),
      })
      if (!res.ok) {
        setIsPlaying(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      const cleanup = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === audio) audioRef.current = null
        setIsPlaying(false)
      }
      audio.addEventListener('ended', cleanup)
      audio.addEventListener('error', cleanup)
      await audio.play().catch(cleanup)
    } catch {
      setIsPlaying(false)
    }
  }

  const cta = rileyPopupCtaForPath(pathname)

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3"
    >
      {showPopup && (
        <div
          role="dialog"
          aria-label="Riley help menu"
          className="riley-popup relative w-56 rounded-2xl border border-flame/50 bg-night/95 backdrop-blur p-3 shadow-2xl shadow-black/60"
        >
          {/* Tail pointing down to the button */}
          <span
            aria-hidden
            className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-night border-r border-b border-flame/50"
          />
          <div className="space-y-2">
            <Link
              href="/tour"
              className="block w-full rounded-lg bg-flame text-night text-center px-3 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              Take the Tour <span aria-hidden>👋</span>
            </Link>
            <Link
              href={cta.href}
              onClick={() => {
                setShowPopup(false)
                stopAudio()
              }}
              className="block w-full rounded-lg border border-white/15 bg-white/5 text-cream text-center px-3 py-2 text-sm font-medium hover:bg-white/10 hover:border-flame/40 transition-colors"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleRileyTap}
        aria-label={
          showPopup ? 'Close Riley menu' : 'Ask Riley about this page'
        }
        aria-expanded={showPopup}
        className="riley-fab grid place-items-center rounded-full bg-card border border-flame/40 shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:shadow-[0_0_36px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-100 transition-all"
        style={{ width: 60, height: 60 }}
        data-playing={isPlaying ? 'true' : 'false'}
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
        {isPlaying && (
          <span
            className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-leaf border-2 border-night"
            aria-hidden
          />
        )}
      </button>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { rileyPopupCtaForPath } from '@/lib/ui/riley-popup-cta'

const SPEECH =
  "Welcome! I am Riley, your RoadWave campground host. I help your guests feel welcome, find their people, and have the kind of camping experience that brings them back year after year. Want to see how I would work at your campground?"

// Campground-page-specific Riley button. Same visual language as the global
// FloatingTourButton but with the host pitch. The secondary popup CTA is
// context-aware via rileyPopupCtaForPath: this component renders on owner-
// facing routes today, so the CTA reads "Start My Campground Pilot" → /start.
export function CampgroundRileyButton() {
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

  async function handleTap() {
    if (showPopup) {
      setShowPopup(false)
      stopAudio()
      return
    }
    setShowPopup(true)
    setIsPlaying(true)
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: SPEECH }),
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
          className="riley-popup relative w-60 rounded-2xl border border-flame/50 bg-night/95 backdrop-blur p-3 shadow-2xl shadow-black/60"
        >
          <span
            aria-hidden
            className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-night border-r border-b border-flame/50"
          />
          <div className="space-y-2">
            <Link
              href="/tour?audience=owner"
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
        onClick={handleTap}
        aria-label={
          showPopup ? 'Close Riley menu' : 'Ask Riley about RoadWave'
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

'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Per-page Riley narration. Anything not in this map falls through to the
// default. Pathnames are matched exactly; no wildcards.
const SPEECH_BY_PATH: Record<string, string> = {
  '/home':
    "This is your home base. Check in, set your vibe, and see what's happening at your campground.",
  '/nearby':
    "These are the campers near you right now. Send a wave to anyone who looks interesting!",
  '/meetups':
    "Check out what's happening at the campground tonight. Join a meetup or create your own!",
  '/privacy':
    'This is where you control who sees you. Go invisible anytime with one tap.',
  '/crossed-paths':
    'These are people you have camped near before. Your camping history, all in one place.',
}

const DEFAULT_SPEECH =
  "Need help? I am Riley, your RoadWave campground host. Tap Next on the tour to learn more!"

// Floating Riley button. Lives in the root layout, hides on /tour where
// Riley is already on stage. Tapping plays a page-specific narration via
// /api/speak; tapping while a clip is playing stops it.
export function FloatingTourButton() {
  const pathname = usePathname()
  const [imgError, setImgError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Stop and clean up any audio on route change.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [pathname])

  if (!pathname || pathname === '/tour') return null

  const speechText = SPEECH_BY_PATH[pathname] ?? DEFAULT_SPEECH

  async function handleClick() {
    // Toggle: if currently playing, stop.
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }

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

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isPlaying ? 'Stop Riley' : 'Ask Riley about this page'}
      className="riley-fab fixed bottom-5 right-5 z-50 grid place-items-center rounded-full bg-card border border-flame/40 shadow-[0_0_22px_rgba(245,158,11,0.35)] hover:shadow-[0_0_36px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-100 transition-all"
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
  )
}

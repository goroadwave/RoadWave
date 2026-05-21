'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// Toast notifier for new guest messages. Polls
// /api/owner/message-counts every 60s; fires a toast when the count
// increases since the last poll. Two flavors:
//   * "New Safety Concern received" -- shown when unread_safety
//     increases. Red border + bell. Wins over a same-tick normal
//     increase (safety is the louder signal).
//   * "New guest message received" -- shown when unread_total
//     increases without a safety increase. Amber border.
//
// Optional sound: gated on localStorage flag set by the
// OwnerMessageSoundToggle component (defaults off). Uses Web Audio
// to generate a short beep so we don't ship an audio asset and so
// the visual notification still fires when browser autoplay policy
// blocks the sound.
//
// Mounted from the owner (authed) layout so it follows the owner
// across every owner-side route. Renders nothing visually until a
// fresh message lands.

const POLL_INTERVAL_MS = 60_000
const SOUND_PREF_KEY = 'roadwave:owner:msg:sound'
const TOAST_DURATION_MS = 8_000

type Counts = { unread_total: number; unread_safety: number }
type ToastKind = 'normal' | 'safety'

async function fetchCounts(): Promise<Counts | null> {
  try {
    const res = await fetch('/api/owner/message-counts', {
      credentials: 'include',
      cache: 'no-store',
    })
    if (!res.ok) return null
    const j = await res.json()
    if (!j || j.ok !== true) return null
    return {
      unread_total: Number(j.unread_total ?? 0),
      unread_safety: Number(j.unread_safety ?? 0),
    }
  } catch {
    return null
  }
}

// Short Web Audio "ping" -- different tone for safety vs normal so a
// listening owner can tell them apart without looking. Returns true
// if it actually played (autoplay can be blocked); the visual toast
// is what owners ultimately rely on.
function playBeep(kind: ToastKind): boolean {
  try {
    type AudioContextCtor = typeof AudioContext
    type AudioContextWindow = Window & {
      webkitAudioContext?: AudioContextCtor
    }
    const w = window as AudioContextWindow
    const Ctor: AudioContextCtor | undefined =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : w.webkitAudioContext
    if (!Ctor) return false
    const ctx = new Ctor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    // Safety = lower urgent tone (E5 → A4 fall). Normal = single
    // bright A5.
    osc.frequency.setValueAtTime(
      kind === 'safety' ? 659 : 880,
      ctx.currentTime,
    )
    if (kind === 'safety') {
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35)
    }
    gain.gain.setValueAtTime(0.0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    // Close the context shortly after so we don't accumulate them
    // on repeated toasts.
    setTimeout(() => {
      void ctx.close().catch(() => {})
    }, 500)
    return true
  } catch {
    return false
  }
}

function soundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SOUND_PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function OwnerMessageToaster() {
  const [toast, setToast] = useState<{ kind: ToastKind; key: number } | null>(
    null,
  )
  const lastCounts = useRef<Counts | null>(null)

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    function fire(kind: ToastKind) {
      setToast({ kind, key: Date.now() })
      if (soundEnabled()) playBeep(kind)
    }

    async function refresh() {
      if (document.visibilityState !== 'visible') return
      const next = await fetchCounts()
      if (cancelled || !next) return
      const prev = lastCounts.current
      // First poll just captures a baseline so we don't toast on
      // initial page load when there are already unread messages.
      if (prev) {
        const safetyUp = next.unread_safety > prev.unread_safety
        const totalUp = next.unread_total > prev.unread_total
        if (safetyUp) fire('safety')
        else if (totalUp) fire('normal')
      }
      lastCounts.current = next
    }

    function startPolling() {
      if (intervalId !== null) return
      intervalId = setInterval(refresh, POLL_INTERVAL_MS)
    }
    function stopPolling() {
      if (intervalId === null) return
      clearInterval(intervalId)
      intervalId = null
    }

    void refresh()
    startPolling()

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        void refresh()
        startPolling()
      } else {
        stopPolling()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Auto-dismiss after TOAST_DURATION_MS. New toasts re-arm the
  // timer via the `key` in toast state.
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(id)
  }, [toast])

  if (!toast) return null

  const isSafety = toast.kind === 'safety'
  const title = isSafety
    ? 'Safety Concern received'
    : 'New guest message received'
  const body = isSafety
    ? 'Review this message now.'
    : 'Review it in Messages.'

  return (
    <div
      role="status"
      aria-live={isSafety ? 'assertive' : 'polite'}
      // z-50 so the toast sits above the persistent Messages nav
      // (which itself can rise on scroll) and any open dropdowns.
      // bottom-24 on mobile keeps it above the iOS home indicator
      // and any sticky bottom bars.
      className="fixed z-50 bottom-24 sm:bottom-6 right-4 sm:right-6 max-w-sm w-[calc(100%-2rem)] sm:w-auto"
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem)`,
      }}
    >
      <div
        className={
          isSafety
            // Safety: red ring, faint red glow, accent bar on the
            // left, brighter red text. Loud enough to grab an
            // owner's attention without taking over the screen.
            ? 'rounded-2xl border-2 border-red-500/70 bg-night/95 shadow-2xl shadow-red-900/50 ring-2 ring-red-500/30 backdrop-blur px-4 py-3 space-y-2 relative overflow-hidden'
            : 'rounded-2xl border border-flame/40 bg-night/95 shadow-2xl shadow-black/40 backdrop-blur px-4 py-3 space-y-2'
        }
      >
        {isSafety && (
          // Left edge accent strip -- pure visual cue, no a11y role.
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={
                isSafety
                  ? 'text-sm font-bold text-red-200 leading-snug'
                  : 'text-sm font-semibold text-cream leading-snug'
              }
            >
              <span aria-hidden className="mr-1.5">
                {isSafety ? '🚨' : '📬'}
              </span>
              {title}
            </p>
            <p className="text-xs text-mist leading-snug mt-0.5">{body}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="shrink-0 text-mist hover:text-cream text-xs leading-none rounded p-1"
          >
            ✕
          </button>
        </div>
        <Link
          href="/owner/messages"
          onClick={() => setToast(null)}
          className={
            isSafety
              ? 'inline-flex items-center gap-1 rounded-lg bg-red-500/25 text-red-100 border border-red-500/60 px-3 py-1.5 text-xs font-bold hover:bg-red-500/35 transition-colors'
              : 'inline-flex items-center gap-1 rounded-lg bg-flame/15 text-flame border border-flame/40 px-3 py-1.5 text-xs font-semibold hover:bg-flame/25 transition-colors'
          }
        >
          {isSafety ? 'Review now' : 'View messages'} →
        </Link>
      </div>
    </div>
  )
}

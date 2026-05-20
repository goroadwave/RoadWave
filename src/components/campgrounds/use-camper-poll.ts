'use client'

import { useEffect, useRef } from 'react'

// Shared polling hook for camper-side QR page client islands. Matches
// the cadence + visibility-gated behavior of the existing
// CamperMessageTracker so all the polls on the page behave the same:
//
//   * Only fires when document.visibilityState === 'visible'. A
//     backgrounded tab doesn't waste battery or RPC calls; the next
//     poll fires immediately when the tab returns to foreground.
//   * Starts after a short delay (matches the interval) so the
//     initial server-rendered data isn't immediately wasted by an
//     unnecessary fetch on mount.
//   * Cleans up on unmount.
//
// Caller passes a stable callback (use useCallback in the caller).
// Errors thrown by the callback are silently swallowed -- this is
// background freshness, not a user-facing fetch, so a transient
// network blip shouldn't show an error to the camper.

export function useCamperPoll(
  callback: () => Promise<void> | void,
  intervalMs: number,
): void {
  // Latest-callback ref pattern. The interval effect captures cbRef
  // (stable across renders) and reads .current at fire time, so the
  // latest callback closure is always invoked without restarting
  // the timer on every render. The ref is updated in a separate
  // effect (not during render) to comply with the React 18+
  // "no ref writes during render" rule.
  const cbRef = useRef(callback)
  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    if (typeof document === 'undefined') return
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      if (cancelled) return
      if (document.visibilityState !== 'visible') {
        // Re-arm later; no fetch while hidden.
        timerId = setTimeout(tick, intervalMs)
        return
      }
      try {
        await cbRef.current()
      } catch {
        // Background poll -- swallow.
      }
      if (cancelled) return
      timerId = setTimeout(tick, intervalMs)
    }

    timerId = setTimeout(tick, intervalMs)

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        if (timerId) clearTimeout(timerId)
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs])
}

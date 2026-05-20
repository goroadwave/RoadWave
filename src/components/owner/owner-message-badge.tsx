'use client'

import { useEffect, useState } from 'react'

// Small live count + pulse-animated dot rendered inside the
// "Messages" nav tab. Polls /api/owner/message-counts every 60s
// while the tab is visible. Pauses when the tab is backgrounded.
//
// Color semantics:
//   * unread_safety > 0  → red pill + red pulse ring (urgent).
//   * unread_total  > 0  → amber pill + amber pulse ring.
//   * both zero          → no pill, no ring, just the "Messages" label.
//
// Counts are read-only here -- updates happen via the
// owner_set_message_status RPC fired by the inbox status buttons.
// The page-revalidate after that RPC plus this 60s poll keep
// everything converged without a Supabase Realtime subscription.

const POLL_INTERVAL_MS = 60_000

type Counts = { unread_total: number; unread_safety: number }

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

export function OwnerMessageBadge() {
  const [counts, setCounts] = useState<Counts>({
    unread_total: 0,
    unread_safety: 0,
  })

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function refresh() {
      if (document.visibilityState !== 'visible') return
      const next = await fetchCounts()
      if (cancelled || !next) return
      setCounts(next)
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

    // Initial fetch + arm polling. Pause on tab background so we
    // don't burn API calls while the owner isn't looking.
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

  const hasSafety = counts.unread_safety > 0
  const hasUnread = counts.unread_total > 0

  if (!hasUnread) return null

  // Display: red pill if any safety alert; amber otherwise.
  // The number rendered IS the unread_total — safety is a subset.
  const pillClass = hasSafety
    ? 'inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse ml-1'
    : 'inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-flame text-night text-[10px] font-bold animate-pulse ml-1'

  return (
    <span
      className={pillClass}
      aria-label={
        hasSafety
          ? `${counts.unread_total} unread, ${counts.unread_safety} urgent safety`
          : `${counts.unread_total} unread`
      }
      title={
        hasSafety
          ? `${counts.unread_total} unread (${counts.unread_safety} safety)`
          : `${counts.unread_total} unread`
      }
    >
      {counts.unread_total > 9 ? '9+' : counts.unread_total}
    </span>
  )
}

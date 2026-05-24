'use client'

import { useEffect, useState } from 'react'

// Small live pill rendered inside the "Messages" nav tab.
//
// Two distinct visual states (2026-05-24 spec):
//
//   * unread_total > 0           -> PULSING pill in red (safety) or
//                                    amber (normal). "Brand new guest
//                                    message arrived; needs the
//                                    owner's attention right now."
//   * active_total > 0 and
//     unread_total == 0          -> STATIC pill in muted flame.
//                                    "There are still messages to
//                                    handle (read but not resolved/
//                                    archived), but nothing brand new
//                                    since the last visit."
//   * active_total == 0          -> nothing (no pill, no glow).
//                                    Resolved + archived messages
//                                    never contribute -- they live
//                                    under their dedicated tabs.
//
// Counts source: /api/owner/message-counts. The counts are scoped to
// the campground the owner is currently viewing (resolved through
// the same OWNER_CAMPGROUND_COOKIE the dashboard uses), so switching
// campgrounds via the header dropdown immediately changes the badge
// on the next poll / refresh event.
//
// Refresh model:
//   * 60s background poll while the tab is visible.
//   * Immediate refresh on tab visibility change.
//   * Immediate refresh on a custom 'roadwave:owner-messages-read'
//     event -- fired by /owner/messages after it auto-marks new->read
//     so the nav badge stops glowing without waiting for the next
//     poll tick.

const POLL_INTERVAL_MS = 60_000
export const OWNER_MESSAGES_READ_EVENT = 'roadwave:owner-messages-read'

type Counts = {
  unread_total: number
  unread_safety: number
  active_total: number
}

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
      active_total: Number(j.active_total ?? j.unread_total ?? 0),
    }
  } catch {
    return null
  }
}

export function OwnerMessageBadge() {
  const [counts, setCounts] = useState<Counts>({
    unread_total: 0,
    unread_safety: 0,
    active_total: 0,
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
    function onMessagesRead() {
      // /owner/messages just bulk-marked new -> read for the active
      // campground. Refresh immediately so the glow stops without
      // the owner having to wait for the next 60s poll tick.
      void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener(OWNER_MESSAGES_READ_EVENT, onMessagesRead)

    return () => {
      cancelled = true
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener(OWNER_MESSAGES_READ_EVENT, onMessagesRead)
    }
  }, [])

  const { unread_total: unread, unread_safety: safety, active_total: active } =
    counts
  const hasUnread = unread > 0
  const hasSafety = safety > 0
  const hasActive = active > 0

  if (!hasActive) return null

  // Three styles:
  //   Safety pulse (red), normal pulse (flame), static (muted flame).
  let pillClass: string
  let label: string
  let count: number
  if (hasUnread && hasSafety) {
    pillClass =
      'inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse ml-1'
    label = `${unread} unread, ${safety} urgent safety`
    count = unread
  } else if (hasUnread) {
    pillClass =
      'inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-flame text-night text-[10px] font-bold animate-pulse ml-1'
    label = `${unread} unread`
    count = unread
  } else {
    // Active but no longer brand-new: muted flame, no pulse. Tells
    // the owner there's still work to do without screaming for
    // attention.
    pillClass =
      'inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full border border-flame/40 bg-flame/10 text-flame text-[10px] font-bold ml-1'
    label = `${active} active`
    count = active
  }

  return (
    <span className={pillClass} aria-label={label} title={label}>
      {count > 9 ? '9+' : count}
    </span>
  )
}

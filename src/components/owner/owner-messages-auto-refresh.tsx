'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Mounted on /owner/messages. The inbox is a server component that
// fetches messages + per-message reply threads on the server, then
// renders static HTML. Without this island the page never re-fetches
// once loaded -- which means a camper reply to an existing thread
// lights up the Messages nav badge (via OwnerMessageBadge's count
// poll + OwnerMessageToaster's reply toast) but the visible thread
// bubbles don't update until the owner manually refreshes or
// triggers a server action (status button, send reply, etc.).
//
// Behavior:
//   * router.refresh() every 30s while the tab is visible. Re-runs
//     the server component, re-fetches messages + threads, and
//     reconciles. Client component state (e.g. an in-progress reply
//     textarea) is preserved across refresh().
//   * Pauses when document.visibilityState is 'hidden' so an owner
//     who has the dashboard in a background tab isn't burning
//     server cycles.
//   * Fires an immediate refresh when the tab transitions back to
//     visible so a returning owner sees fresh state instantly.
//
// Renders nothing.
const REFRESH_INTERVAL_MS = 30_000

export function OwnerMessagesAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    function tick() {
      if (document.visibilityState !== 'visible') return
      router.refresh()
    }

    function start() {
      if (intervalId !== null) return
      intervalId = setInterval(tick, REFRESH_INTERVAL_MS)
    }
    function stop() {
      if (intervalId === null) return
      clearInterval(intervalId)
      intervalId = null
    }

    start()

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        // Catch up immediately so the owner sees the latest data
        // the moment they return to the tab.
        router.refresh()
        start()
      } else {
        stop()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [router])

  return null
}

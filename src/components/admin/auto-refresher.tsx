'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Calls router.refresh() on a fixed interval. Pauses while the tab is
 * hidden so we don't hammer the server when nobody's watching. Used by
 * the activity feed (60s) and system health (5min).
 */
export function AutoRefresher({ everyMs }: { everyMs: number }) {
  const router = useRouter()
  useEffect(() => {
    if (typeof window === 'undefined') return
    let id: number | null = null
    function start() {
      stop()
      id = window.setInterval(() => {
        if (document.visibilityState === 'visible') router.refresh()
      }, everyMs)
    }
    function stop() {
      if (id !== null) {
        window.clearInterval(id)
        id = null
      }
    }
    function onVis() {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [everyMs, router])
  return null
}

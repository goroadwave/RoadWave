'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Mounted inside /crossed-paths/[id] (the matched-camper conversation).
// The page is a server component that fetches crossed_paths_messages
// for the pair; without this island the only ways new messages from
// the other camper get rendered are (a) the user manually reloads,
// (b) the StaticResponsePicker / textarea fires router.refresh() after
// the local camper sends.
//
// This component mirrors the existing OwnerMessagesAutoRefresh pattern
// (lightweight router.refresh() polling, visibility-aware, immediate
// catch-up on focus) so the RoadWave repo has ONE refresh idiom and
// no realtime infra has to be wired up yet. The interval is tighter
// (5s vs the owner inbox's 30s) because the matched dialogue is
// conversational -- a 30s wait between bubbles would feel broken --
// and the cost is small: the server re-fetches at most one
// crossed_paths_messages SELECT per tab per 5s, RLS already restricts
// the row set to the two participants.
//
// Dedup contract: the server returns ALL messages by id every poll;
// the conversation list keys each <li> by message id so React
// reconciles in place. The StaticResponsePicker and textarea each
// call router.refresh() after their server action returns, so the
// SENDER sees their own message immediately (no waiting for the next
// poll); the RECIPIENT picks it up on the next visible tick.
//
// Pauses when document.visibilityState is hidden so a backgrounded
// tab isn't burning Supabase quota. Fires an immediate refresh on
// the transition back to visible so a returning camper sees fresh
// state instantly.
//
// Renders nothing.
const REFRESH_INTERVAL_MS = 5_000

export function CrossedPathAutoRefresh() {
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
        // Catch up immediately so the returning camper sees the
        // newest messages without waiting up to REFRESH_INTERVAL_MS.
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

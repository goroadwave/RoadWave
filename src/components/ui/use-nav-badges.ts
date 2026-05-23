'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  type NavBadgeCounts,
  ZERO_BADGE_COUNTS,
} from '@/lib/notifications/nav-badges'

// Client-side per-category badge counts for AppNav. Mirrors the
// server-side loadNavBadgeCounts mapping but runs in the browser so
// the badges stay fresh as new notifications arrive between renders.
//
// Polls public.notifications every 60s while the tab is visible.
// Same cadence + visibility-gating as useCamperPoll and the
// AppLantern. Initial state is seeded from the server-side count
// (see (app)/layout.tsx) so the first paint already has correct
// badges -- the first poll then keeps them in sync.

const POLL_INTERVAL_MS = 60_000

const BULLETINS_TYPES = new Set(['bulletin'])
const MEETUPS_TYPES = new Set(['meetup_invite', 'meetup_rsvp'])
const WAVES_TYPES = new Set(['wave_received', 'wave_matched'])
const PAST_WAVES_TYPES = new Set(['new_message', 'wave_connected'])

export function useNavBadges(initial: NavBadgeCounts): NavBadgeCounts {
  const [counts, setCounts] = useState<NavBadgeCounts>(initial)

  useEffect(() => {
    let cancelled = false

    async function fetchCounts() {
      if (cancelled) return
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return
      }
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('type')
        .eq('is_read', false)
        .limit(500)
      if (cancelled || error || !data) return
      const next: NavBadgeCounts = { ...ZERO_BADGE_COUNTS }
      for (const row of data as { type: string }[]) {
        if (BULLETINS_TYPES.has(row.type)) next.bulletins += 1
        else if (MEETUPS_TYPES.has(row.type)) next.meetups += 1
        else if (WAVES_TYPES.has(row.type)) next.waves += 1
        else if (PAST_WAVES_TYPES.has(row.type)) next.pastWaves += 1
      }
      setCounts(next)
    }

    // Fire once on mount to override the SSR seed with a fresh
    // count (the seed could be a few ms old by the time the page
    // hydrates). Then poll every 60s while the tab is visible.
    void fetchCounts()
    const timer = window.setInterval(fetchCounts, POLL_INTERVAL_MS)
    function onVisibility() {
      if (document.visibilityState === 'visible') void fetchCounts()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return counts
}

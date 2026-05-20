'use client'

import { useEffect, useState } from 'react'
import {
  addAckedCriticalId,
  LANTERN_CRITICAL_EVENT,
  loadAckedCriticalIds,
} from '@/components/campgrounds/lantern-storage'

// Phase 3c -- prominent red weather/safety banner at the very top of
// the camper QR page (above the welcome header). Driven by:
//
//   * SSR initial: the most recent active is_critical bulletin
//     fetched server-side in /campground/[slug]/page.tsx so first
//     paint is correct (no flicker, no FOUC).
//   * Event subscription: LANTERN_CRITICAL_EVENT, fired by
//     BulletinsList whenever its poll detects a critical change
//     (new id, removed, or expired). Single source of truth = the
//     existing /api/campground/[slug]/dynamic poll; no extra
//     network call from this component.
//
// Acknowledgement (Q6 = 6a):
//
//   * Default: prominent red banner with the message + Dismiss
//     button + "For emergencies, call 911" reminder.
//   * Dismissed: collapses to a small pinned red chip that stays
//     visible until the critical bulletin expires OR the owner
//     deactivates it. Tapping the chip re-expands the full banner.
//   * Acknowledgement is per-bulletin-id in localStorage so a NEW
//     critical bulletin gets the full banner treatment again even
//     if the camper previously acked an older one.
//
// previewMode={true} (owner /owner/preview):
//   * Banner renders so the owner sees how it'll look.
//   * Dismiss does nothing (no localStorage writes from preview).

type CriticalBulletin = {
  id: string
  message: string
  expires_at: string | null
  created_at: string
}

export function CriticalBanner({
  campgroundId,
  initial,
  previewMode = false,
}: {
  campgroundId: string
  initial: CriticalBulletin | null
  previewMode?: boolean
}) {
  const [critical, setCritical] = useState<CriticalBulletin | null>(initial)
  const [acked, setAcked] = useState<Set<string>>(() => new Set())
  // Whether the chip-collapsed state has been re-expanded by the
  // camper (overrides the localStorage ack for this session only,
  // so they can re-see the message without un-acking).
  const [forceExpand, setForceExpand] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydration safety -- the SSR shell renders the initial banner;
  // localStorage read happens post-mount. Without the gate the
  // server-rendered "full banner" would become "chip" instantly
  // on hydration if the camper had already acked.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    if (!previewMode) {
      setAcked(loadAckedCriticalIds(campgroundId))
    }
  }, [campgroundId, previewMode])

  // Subscribe to the polled critical updates from BulletinsList.
  useEffect(() => {
    if (previewMode) return
    function onCritical(e: Event) {
      const ce = e as CustomEvent<{
        campgroundId?: string
        critical?: CriticalBulletin | null
      }>
      if (ce.detail?.campgroundId !== campgroundId) return
      const next = ce.detail.critical ?? null
      setCritical((prev) => {
        // Identity check by id + expires_at -- avoids re-rendering
        // when the polled payload is structurally identical to the
        // current state.
        if (!prev && !next) return prev
        if (
          prev &&
          next &&
          prev.id === next.id &&
          prev.expires_at === next.expires_at
        ) {
          return prev
        }
        return next
      })
      // A new critical id arriving while a chip was forced-expanded
      // resets the force-expand flag -- otherwise the camper would
      // see the new full banner with a stale "I see it" button
      // from the previous bulletin.
      setForceExpand(false)
    }
    window.addEventListener(LANTERN_CRITICAL_EVENT, onCritical)
    return () => window.removeEventListener(LANTERN_CRITICAL_EVENT, onCritical)
  }, [campgroundId, previewMode])

  if (!critical) return null

  const isAcked = mounted && acked.has(critical.id) && !forceExpand

  function acknowledge() {
    if (previewMode) {
      // In preview, dismiss is visual-only -- no localStorage write.
      setForceExpand(false)
      setAcked((prev) => {
        const next = new Set(prev)
        if (critical) next.add(critical.id)
        return next
      })
      return
    }
    if (!critical) return
    addAckedCriticalId(campgroundId, critical.id)
    setAcked((prev) => {
      const next = new Set(prev)
      next.add(critical.id)
      return next
    })
    setForceExpand(false)
  }

  if (isAcked) {
    // Collapsed chip -- stays pinned at the top so the camper
    // remembers there's an active notice. Tap to re-expand.
    return (
      <button
        type="button"
        onClick={() => setForceExpand(true)}
        className="w-full rounded-2xl border border-red-500/40 bg-red-500/[0.08] px-4 py-2 flex items-center justify-between gap-3 text-left hover:bg-red-500/[0.12] transition-colors"
        aria-label="Re-open weather and safety notice"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span aria-hidden className="text-base">
            ⚠
          </span>
          <span className="text-xs font-semibold text-red-200">
            Weather &amp; safety notice — tap to view
          </span>
        </span>
        <span aria-hidden className="text-red-300 text-xs">
          ›
        </span>
      </button>
    )
  }

  return (
    <section
      role="alert"
      aria-live="polite"
      className="rounded-2xl border-2 border-red-500/70 bg-red-500/[0.10] p-4 space-y-3 shadow-lg shadow-red-500/10"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-500/50 bg-red-500/20 text-xl"
        >
          ⚠
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-red-200 font-bold">
            Weather &amp; safety notice
          </p>
          <p className="text-sm sm:text-base text-cream leading-relaxed whitespace-pre-wrap font-medium">
            {critical.message}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-red-200/80 leading-snug">
        For emergencies, call 911. RoadWave is not an emergency
        service.
      </p>
      <button
        type="button"
        onClick={acknowledge}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/50 bg-red-500/15 text-red-100 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/25 transition-colors"
      >
        I see it
      </button>
    </section>
  )
}

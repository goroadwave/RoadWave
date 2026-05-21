'use client'

import { useEffect } from 'react'

// QR-landing scroll guard. Mounted on /campground/[slug] only.
//
// The page has TWO defenses against landing mid-page on reload:
//   1. An inline server-rendered <script> at the top of <main> that
//      sets history.scrollRestoration='manual' + scrollTo(0,0)
//      synchronously when the browser parses it. That's the earliest
//      we can intervene.
//   2. This client island, which fires AFTER React hydrates and
//      re-pins to (0,0) across several frames. Mobile Safari has
//      been observed to restore scroll AFTER the inline script in
//      some flows, and the camper hub has heavy late-mounting
//      islands (CriticalBanner, HappeningSection, OfficeHelpCard
//      which opens itself if the camper has a stored thread,
//      lazy-loaded park map image) that all cause layout shift on
//      the second client render. A single scrollTo(0,0) on mount
//      can run BEFORE those shifts and get overridden by the
//      browser trying to "preserve scroll position relative to the
//      new height."
//
// Strategy:
//   * Bail out entirely when location.hash is set on mount -- the
//     camper is anchor-navigating (Quick Action "Contact office"
//     #office-help, shared deep link, etc.) and the browser should
//     scroll to that target.
//   * Otherwise: set scrollRestoration='manual' + force-scroll
//     across mount, rAF, 50ms, 250ms, 600ms. The later ticks catch
//     the slow-mobile case where hydration + lazy image swap
//     finishes well after the first paint.
//   * On unmount, restore scrollRestoration='auto' so other pages
//     keep their normal back/forward scroll behavior.
//
// Renders nothing.

export function CamperScrollToTop() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Anchor navigation overrides everything -- if the camper
    // arrived at #office-help we let the browser handle the scroll
    // and don't interfere. Read the hash ONCE on mount; a later
    // hashchange (user tapping a Quick Action) is unrelated to
    // initial-load behavior.
    if (window.location.hash.length > 1) return

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    function forceTop() {
      // If the user has scrolled deliberately between the ticks
      // (e.g., they tapped a Quick Action quickly), respect that --
      // a non-trivial scroll position from a user gesture should
      // not be undone. We only fight the BROWSER's auto-restore,
      // not the user.
      //
      // Practical signal: if a hash appeared during this window,
      // skip the forced scroll. The Quick Action links update the
      // URL hash via native anchor navigation.
      if (window.location.hash.length > 1) return
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      // Safari / iOS sometimes ignore window.scrollTo when the
      // body has its own scroll context; setting both
      // documentElement and body covers all the layout quirks.
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    forceTop()
    const rafId = requestAnimationFrame(forceTop)
    const t1 = window.setTimeout(forceTop, 50)
    const t2 = window.setTimeout(forceTop, 250)
    const t3 = window.setTimeout(forceTop, 600)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto'
      }
    }
  }, [])

  return null
}

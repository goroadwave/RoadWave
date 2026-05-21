'use client'

import { useEffect, useLayoutEffect } from 'react'

// Backup scroll-to-top guard for the public campground QR landing page.
// The inline server-rendered <script> in campground-guest-hub-body.tsx
// is the primary defense (runs at HTML parse time, BEFORE the browser
// can anchor-jump on a stale fragment). This component is the belt +
// braces backup: a useLayoutEffect that fires after React hydrates,
// plus a `pageshow` listener with React-managed cleanup.
//
// Why both? The inline script is the only thing that runs early enough
// to beat the browser's anchor-jump on cold load -- React hydration
// always lands later. But the inline script can be lost to CSP nonce
// mismatches, ad-blocker noise, or a `dangerouslySetInnerHTML` that
// fails to parse on an old engine. Having a hydrated-React backup
// means the page still lands at the top in those edge cases.
//
// What this component does NOT do:
//   * Run on the owner /owner/preview surface -- the parent component
//     skips rendering this entirely when previewMode is true.
//   * Fight intentional user scrolls. The early-stop pattern in the
//     inline script handles that; this component only fires on
//     hydration + bfcache restore, never on every interaction.
//   * Touch URL state. The inline script already strips known stale
//     section hashes; this component just pins scroll.

// Same anchor set the inline script strips. Lives here so future
// additions to the in-page Quick Action anchor list only need to be
// added in two places (both files). Lowercase + leading-hash form so
// the comparison can be direct against `location.hash`.
const KNOWN_SECTION_HASHES = new Set([
  '#park-map',
  '#wifi',
  '#office-help',
  '#bulletins',
  '#meetups',
  '#critical-notice',
])

// Phase F (2026-05-21): deliberate deep-link anchors that the AppNav
// fires intentionally (currently just the "Camper Connections" tab
// at /nearby, which redirects to /campground/<slug>#camper-connections).
// For these we want the browser's native anchor-jump to land the
// camper at the section; the pin loop is skipped entirely. Must
// stay in sync with the DEEPLINK set in the inline script in
// campground-guest-hub-body.tsx.
const DEEPLINK_HASHES = new Set(['#camper-connections'])

function pin() {
  if (typeof window === 'undefined') return
  window.scrollTo(0, 0)
  if (document.scrollingElement) {
    ;(document.scrollingElement as HTMLElement).scrollTop = 0
  }
  document.documentElement.scrollTop = 0
  if (document.body) document.body.scrollTop = 0
}

// useLayoutEffect on the server logs a noisy warning; React.useEffect
// is the SSR-safe fallback. We get useLayoutEffect on the client (for
// the pre-paint pin) and useEffect on the server (no-op during SSR).
const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export function QrScrollTopGuard() {
  // Pre-paint pin. Strips a stale section hash if the inline script
  // didn't get to it, then forces scroll back to 0 across a short
  // burst of timers so font-swap / hydration / image-load layout
  // shifts don't leave the camper mid-page.
  useIsoLayoutEffect(() => {
    if (typeof window === 'undefined') return

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    const h = window.location.hash

    // Phase F: deliberate deep-link from the AppNav (e.g.
    // #camper-connections fired by /nearby). Skip the strip AND
    // skip the pin loop -- the browser's anchor-jump should win
    // and land the camper at the section.
    if (h && DEEPLINK_HASHES.has(h)) {
      return
    }

    if (h && KNOWN_SECTION_HASHES.has(h)) {
      try {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        )
      } catch {
        // history mutation can throw in sandboxed contexts; the
        // inline script + pin loop still handles those.
      }
    }

    pin()
    const raf = requestAnimationFrame(pin)
    const t1 = window.setTimeout(pin, 50)
    const t2 = window.setTimeout(pin, 250)
    const t3 = window.setTimeout(pin, 750)

    // Optional dev-only diagnostics so we can trace any future
    // mid-page-landing report from a real device. Enabled via
    // `?debug=scroll` query parameter -- safe to leave in prod since
    // the gate is explicit opt-in.
    let debugTimer: number | null = null
    if (window.location.search.includes('debug=scroll')) {
      const log = (phase: string) => {
        console.log('[QR scroll debug]', {
          phase,
          scrollY: window.scrollY,
          hash: window.location.hash,
          search: window.location.search,
          path: window.location.pathname,
        })
      }
      log('layout-effect')
      debugTimer = window.setTimeout(() => log('after 1s'), 1000)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      if (debugTimer !== null) window.clearTimeout(debugTimer)
    }
  }, [])

  // bfcache restore -- mobile Safari (and Chrome with the cache hit)
  // skips the normal load sequence and just reanimates the prior
  // page. The inline script's pageshow handler covers this too, but
  // we mirror it here so the React-managed cleanup runs on unmount.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return
      pin()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return null
}

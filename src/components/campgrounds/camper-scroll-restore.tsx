'use client'

import { useEffect } from 'react'

// Tiny client island mounted on the camper QR page to make reloads
// predictable. Two problems we're solving:
//
//   1. Browser native scroll restoration is "auto" by default, so a
//      reload of /campground/<slug> can leave the viewport at the
//      last scroll position the camper had before refresh -- which
//      lands them in the middle of the page (commonly the footer /
//      Meet Other Campers accordion area) instead of at the top.
//   2. The page is long-form and grows after hydration (Lantern,
//      tracker cards, Happening section), so an "auto" restoration
//      can also overshoot once those islands mount.
//
// Behavior:
//   * If the URL has a hash (#office-help, #park-map, etc.) we leave
//     the browser to handle it -- intentional in-page anchor.
//   * Otherwise we set scrollRestoration = 'manual' once and force
//     scroll-to-top on mount.
//
// Renders nothing.
export function CamperScrollRestore() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual'
      }
    } catch {
      // Some browsers throw when assigning scrollRestoration in
      // sandboxed iframes -- safe to ignore.
    }
    if (window.location.hash.length > 1) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return null
}

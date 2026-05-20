'use client'

import { useEffect, useState } from 'react'

// Auto-fires window.print() once the document fully loads. Used by
// the dedicated Front Desk Card printable route so the browser's
// print dialog appears as soon as the card is on screen and the QR
// image has finished decoding. A visible "Print this card" button
// is provided as a fallback when:
//   * the user is on a browser that ignores the auto-fire (mobile
//     Safari is a common case)
//   * the user cancelled the first print dialog and wants to retry
//   * the page is being viewed for review rather than for printing
//
// The auto-fire is one-shot: subsequent re-renders (e.g. React
// strict-mode double-mount in dev) don't re-prompt.

type Props = {
  /** Wait for these image src URLs to load before printing. */
  waitForImages?: string[]
}

export function AutoPrintOnLoad({ waitForImages = [] }: Props) {
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    if (printed) return
    let cancelled = false

    async function waitForReady() {
      // 1) Document.readyState 'complete' = all subresources loaded.
      if (document.readyState !== 'complete') {
        await new Promise<void>((resolve) => {
          const onLoad = () => {
            window.removeEventListener('load', onLoad)
            resolve()
          }
          window.addEventListener('load', onLoad)
        })
      }
      if (cancelled) return

      // 2) Decode all <img> elements in the document. The QR PNG is
      //    embedded as a data URL so decode is synchronous; the
      //    campground logo is a remote URL and may need a network
      //    fetch. img.decode() resolves only after the image is
      //    fully ready to paint.
      const imgs = Array.from(document.querySelectorAll('img'))
      const waits: Promise<unknown>[] = []
      for (const img of imgs) {
        // decode failures don't block print -- broken images just
        // print as their alt text.
        waits.push(img.decode().catch(() => null))
      }
      // If the caller listed specific src URLs to wait for, also
      // wait on those (Image() with onload). Useful when the printable
      // route fetches an image from a separate route that may stream.
      for (const src of waitForImages) {
        waits.push(
          new Promise<void>((resolve) => {
            const i = new Image()
            i.onload = () => resolve()
            i.onerror = () => resolve()
            i.src = src
          }),
        )
      }
      await Promise.all(waits)
      if (cancelled) return

      // 3) One frame of paint settle, then trigger print.
      requestAnimationFrame(() => {
        if (cancelled) return
        setPrinted(true)
        window.print()
      })
    }

    void waitForReady()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot effect on mount
  }, [])

  return null
}

// Visible "Print this card" button — sibling to AutoPrintOnLoad so
// owners can re-print after cancelling, or print manually when the
// auto-fire was skipped by their browser.
export function PrintCardButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors print:hidden"
    >
      Print this card
    </button>
  )
}

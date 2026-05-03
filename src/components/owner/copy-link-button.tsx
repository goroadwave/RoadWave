'use client'

import { useState } from 'react'

// Small client island for the Owner-dashboard "Copy link" button.
// Server-rendered surfaces (the dashboard page is RSC) can drop this
// in next to a URL string to give owners a one-tap copy.

type Props = {
  url: string
  label?: string
}

export function CopyLinkButton({ url, label = 'Copy link' }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be denied (insecure context, browser extension,
      // etc.) — fall back to selecting the URL in the browser address bar
      // by no-op. The owner can long-press the link to copy manually.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={
        copied
          ? 'shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-leaf/40 bg-leaf/15 text-leaf px-3 py-2 text-xs font-semibold transition-colors'
          : 'shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/15 text-flame px-3 py-2 text-xs font-semibold hover:bg-flame/25 transition-colors'
      }
    >
      {copied ? 'Copied ✓' : label}
    </button>
  )
}

'use client'

import { useState } from 'react'

// Phase 4a -- Copy-to-clipboard button for the Wi-Fi password card.
// Mirrors the existing OwnerMessageCopyNumber pattern: 2-second
// "Copied" confirmation, fail-safe if navigator.clipboard is
// unavailable (private mode, http context, very old browsers).
// Renders inline next to the password value so the camper doesn't
// have to manually select + copy on mobile.

export function WifiCopyButton({ password }: { password: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function copy() {
    setError(null)
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable or denied -- the password text is
      // already select-all'd in the parent card so the camper can
      // long-press / triple-tap to copy manually. We just say so.
      setError('Copy not available — tap the password to select.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-leaf/40 bg-leaf/10 text-leaf px-2.5 py-1 text-[11px] font-semibold hover:bg-leaf/15 transition-colors"
      >
        <span aria-hidden>{copied ? '✓' : '⧉'}</span>
        {copied ? 'Copied' : 'Copy password'}
      </button>
      {error && <span className="text-[11px] text-red-300">{error}</span>}
    </div>
  )
}

'use client'

import { useState } from 'react'

// Small client island for the Owner-dashboard "Copy link" button.
// Server-rendered surfaces (the dashboard page is RSC) can drop this
// in next to a URL string to give owners a one-tap copy.

type Props = {
  url: string
  label?: string
}

type Status = 'idle' | 'copied' | 'failed'

export function CopyLinkButton({ url, label = 'Copy link' }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  async function copy() {
    const ok = await copyToClipboard(url)
    setStatus(ok ? 'copied' : 'failed')
    setTimeout(() => setStatus('idle'), 2000)
  }

  let text = label
  let cls =
    'shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/15 text-flame px-3 py-2 text-xs font-semibold hover:bg-flame/25 transition-colors'
  if (status === 'copied') {
    text = 'Copied ✓'
    cls =
      'shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-leaf/40 bg-leaf/15 text-leaf px-3 py-2 text-xs font-semibold transition-colors'
  } else if (status === 'failed') {
    text = 'Copy failed — press and hold to select'
    cls =
      'shrink-0 inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 px-3 py-2 text-xs font-semibold transition-colors'
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={cls}
    >
      {text}
    </button>
  )
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Tier 1: navigator.clipboard.writeText (HTTPS, modern browsers).
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through.
  }
  // Tier 2: legacy execCommand fallback via an off-screen textarea.
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.width = '1px'
    ta.style.height = '1px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

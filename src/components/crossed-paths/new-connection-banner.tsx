'use client'

import { useEffect, useState } from 'react'

// One-time dismissible safety reminder shown when a mutual wave opens a
// chat. Per-thread persistence: the dismiss flag is stored in localStorage
// keyed by the crossed_path_id, so each new connection prompts once.

const KEY_PREFIX = 'roadwave:new-connection-banner-dismissed:'

type Props = {
  crossedPathId: string
}

export function NewConnectionBanner({ crossedPathId }: Props) {
  // null = unknown (still reading storage). Avoids a flash of the banner
  // for users who already dismissed it.
  const [dismissed, setDismissed] = useState<boolean | null>(null)
  const storageKey = KEY_PREFIX + crossedPathId

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === '1')
    } catch {
      // Storage blocked (private mode etc.) — show the banner; dismiss
      // becomes session-only.
      setDismissed(false)
    }
  }, [storageKey])

  function handleDismiss() {
    try {
      window.localStorage.setItem(storageKey, '1')
    } catch {
      // Ignore — dismissal won't persist across sessions, but the banner
      // still goes away for this view.
    }
    setDismissed(true)
  }

  if (dismissed !== false) return null

  return (
    <div
      role="status"
      className="rounded-2xl border border-flame/30 bg-flame/[0.08] p-4 sm:p-5 flex items-start gap-3"
    >
      <span aria-hidden className="text-2xl leading-none">
        👋
      </span>
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-cream">You have a new connection.</p>
        <p className="text-sm text-mist leading-relaxed">
          Meet in visible public campground areas. Trust your instincts.
          Report anything suspicious.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss safety reminder"
        className="shrink-0 h-7 w-7 grid place-items-center rounded-md text-mist hover:text-cream hover:bg-white/5"
      >
        ✕
      </button>
    </div>
  )
}

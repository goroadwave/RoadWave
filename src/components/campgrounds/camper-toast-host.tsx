'use client'

import { useEffect, useState } from 'react'
import {
  LANTERN_BULLETINS_EVENT,
  LANTERN_MEETUPS_EVENT,
  LANTERN_OFFICE_REPLY_EVENT,
  LANTERN_OPEN_THREAD_EVENT,
} from '@/components/campgrounds/lantern-storage'

// Phase 4c -- small, non-intrusive toasts on the camper QR page.
// Subscribes to the existing Lantern events fired by the existing
// pollers (CamperMessageTracker, HappeningSection), so this
// component does NOT add any new network calls. Toasts only fire
// for events that arrive AFTER mount -- the upstream pollers
// already capture an initial baseline on first poll and only
// dispatch on subsequent strictly-newer payloads, so a fresh page
// load with pre-existing unread content won't pop a toast (the
// Lantern badge already handles that initial state).
//
// Visual design:
//   * Bottom-center on mobile (above iOS safe-area), bottom-right
//     on >= sm. Matches the owner-side OwnerMessageToaster pattern
//     so the two sides feel consistent.
//   * Subtle slide-up animation, disabled when
//     prefers-reduced-motion is set.
//   * Persistent until explicit dismiss (× button) or CTA click.
//     The previous 7s auto-dismiss was removed 2026-05-23 -- campers
//     who looked away even briefly would miss notifications entirely,
//     and the underlying record still lives in the Lantern, so
//     persistence on the popup doesn't risk losing the camper's
//     ability to clear it. Tap the ✕ to dismiss the popup only;
//     the Lantern entry stays until the camper opens the Lantern.
//   * Queue cap of 3 -- if a fourth event arrives, the oldest
//     toast drops off so the screen never stacks more than three
//     at once.
//   * Each toast has a primary action ("View" / "View Reply") and
//     a Dismiss button.
//
// Tap actions:
//   * Office reply: dispatches LANTERN_OPEN_THREAD_EVENT so the
//     unified Office Help & Messages section (CamperMessageTracker)
//     expands the matching card inline and scrolls into view. NO
//     new tab is opened from the QR page -- the camper stays on the
//     same page they're already on. The /m/<id> route still exists
//     for external secure email reply links, where opening a fresh
//     gated page IS the right thing.
//   * Bulletin / Meetup: smooth-scroll to the matching anchor
//     (#bulletins / #meetups) inside the Happening section.
//
// previewMode = true (owner /owner/preview) keeps the host mounted
// but never fires a toast, so a previewing owner doesn't see fake
// notifications driven by their own localStorage state.

type ToastKind = 'reply' | 'bulletin' | 'meetup'

type Toast = {
  // Unique id per toast for React keys + auto-dismiss cancel.
  key: number
  kind: ToastKind
  // Only set for replies -- the message thread id, used to
  // resolve the localStorage entry on click.
  threadId?: string
}

const MAX_TOASTS = 3

export function CamperToastHost({
  campgroundId,
  previewMode = false,
}: {
  campgroundId: string
  previewMode?: boolean
}) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  // Mount gate -- the host is rendered server-side as nothing
  // (no toasts in initial state), then hydrates without any
  // hydration mismatch. Subsequent state changes are all
  // client-driven from events.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || previewMode) return

    function push(t: Omit<Toast, 'key'>) {
      const next: Toast = { ...t, key: Date.now() + Math.random() }
      setToasts((prev) => {
        // Drop the oldest if we're already at capacity, then
        // append. Newest at the bottom of the queue so the stack
        // visually grows upward from the bottom of the screen.
        const trimmed = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
        return [...trimmed, next]
      })
    }

    function onReply(e: Event) {
      const ce = e as CustomEvent<{
        campgroundId?: string
        threadId?: string
      }>
      if (ce.detail?.campgroundId !== campgroundId) return
      push({ kind: 'reply', threadId: ce.detail.threadId })
    }
    function onBulletins(e: Event) {
      const ce = e as CustomEvent<{ campgroundId?: string }>
      if (ce.detail?.campgroundId !== campgroundId) return
      push({ kind: 'bulletin' })
    }
    function onMeetups(e: Event) {
      const ce = e as CustomEvent<{ campgroundId?: string }>
      if (ce.detail?.campgroundId !== campgroundId) return
      push({ kind: 'meetup' })
    }

    window.addEventListener(LANTERN_OFFICE_REPLY_EVENT, onReply)
    window.addEventListener(LANTERN_BULLETINS_EVENT, onBulletins)
    window.addEventListener(LANTERN_MEETUPS_EVENT, onMeetups)
    return () => {
      window.removeEventListener(LANTERN_OFFICE_REPLY_EVENT, onReply)
      window.removeEventListener(LANTERN_BULLETINS_EVENT, onBulletins)
      window.removeEventListener(LANTERN_MEETUPS_EVENT, onMeetups)
    }
  }, [mounted, previewMode, campgroundId])

  if (!mounted || toasts.length === 0) return null

  function dismiss(key: number) {
    setToasts((prev) => prev.filter((t) => t.key !== key))
  }

  function action(t: Toast) {
    if (t.kind === 'reply' && t.threadId) {
      // Fire the cross-surface "open this thread inline" event.
      // CamperMessageTracker listens, expands the matching card,
      // and scrolls #office-help into view. No new tab, no
      // navigation -- the camper stays inside the unified Office
      // Help & Messages section. If the tracker doesn't recognize
      // the thread id (rare: reply landed for a thread no longer
      // stored on this device, e.g. it was Cleared from this
      // device), the tracker silently no-ops and the camper still
      // has the Lantern entry + persistent card to fall back on.
      window.dispatchEvent(
        new CustomEvent(LANTERN_OPEN_THREAD_EVENT, {
          detail: { campgroundId, threadId: t.threadId },
        }),
      )
      dismiss(t.key)
      return
    }
    if (t.kind === 'bulletin') {
      document
        .getElementById('bulletins')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (t.kind === 'meetup') {
      document
        .getElementById('meetups')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    dismiss(t.key)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      // Bottom-center on mobile (with safe-area inset for iOS),
      // bottom-right on >= sm. z-50 so the toast sits above page
      // content, the Lantern panel (which is also z-50 but lives
      // in the header so doesn't overlap), and any sticky elements
      // at the bottom of the layout. The CriticalBanner is in
      // document flow at the top, so z-index doesn't matter for it.
      className="fixed z-50 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 w-[calc(100%-2rem)] max-w-sm sm:max-w-sm flex flex-col gap-2 pointer-events-none"
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem)`,
      }}
    >
      {toasts.map((t) => (
        <CamperToast
          key={t.key}
          toast={t}
          onAction={() => action(t)}
          onDismiss={() => dismiss(t.key)}
        />
      ))}
    </div>
  )
}

const COPY: Record<
  ToastKind,
  { icon: string; title: string; body?: string; cta: string }
> = {
  reply: {
    icon: '📬',
    title: 'New reply from the office',
    body: 'Tap to view your message.',
    cta: 'View reply',
  },
  bulletin: {
    icon: '📣',
    title: 'New campground update',
    cta: 'View',
  },
  meetup: {
    icon: '📅',
    title: 'New meetup posted',
    cta: 'View',
  },
}

function CamperToast({
  toast,
  onAction,
  onDismiss,
}: {
  toast: Toast
  onAction: () => void
  onDismiss: () => void
}) {
  const copy = COPY[toast.kind]
  return (
    // pointer-events-auto re-enables interaction on the toast itself
    // (the parent container is pointer-events-none so non-toast areas
    // of the bottom bar don't intercept taps).
    <div className="camper-toast pointer-events-auto rounded-2xl border border-flame/40 bg-night/95 shadow-2xl shadow-black/40 backdrop-blur px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-cream leading-snug min-w-0">
          <span aria-hidden className="mr-1.5">
            {copy.icon}
          </span>
          {copy.title}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 text-mist hover:text-cream text-xs leading-none rounded p-1"
        >
          ✕
        </button>
      </div>
      {copy.body && (
        <p className="text-xs text-mist leading-snug">{copy.body}</p>
      )}
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1 rounded-lg bg-flame/15 text-flame border border-flame/40 px-3 py-1.5 text-xs font-semibold hover:bg-flame/25 transition-colors"
      >
        {copy.cta} →
      </button>
    </div>
  )
}

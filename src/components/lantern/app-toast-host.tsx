'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { markNotificationReadAction } from '@/app/(app)/notifications/actions'

// Persistent popup notifications for signed-in (app) pages. Mirrors
// the CamperToastHost behavior on the QR campground hub: a toast
// pops in the bottom-of-screen tray when a new unread notification
// arrives, stays visible until the camper taps X (dismiss popup only)
// or View (mark read + navigate), and dedupes by notification id so
// the same toast never reappears once dismissed.
//
// Notification source: public.notifications via the user-scoped
// supabase client. RLS scopes results to auth.uid() automatically.
// Polls every 60s while the tab is visible -- same cadence as the
// AppLantern + useNavBadges hook. The poll is independent of those
// surfaces; the cost is one extra select-where-is_read=false per
// minute per camper, which is negligible.
//
// Dedupe model:
//   * On mount, fetches the current unread notification ids and
//     seeds them into the dedupe set. We don't toast for anything
//     that was already unread at mount time -- the Lantern + nav
//     badges already surface that. Toasts fire only on STRICTLY
//     NEW arrivals (notifications inserted after this component
//     mounted on this device).
//   * After mount, each poll diffs the unread set against the
//     dedupe set. Any id in the unread set but not in the dedupe
//     set is a new arrival -> push a toast. Add the id to the
//     dedupe set so subsequent polls don't re-fire.
//   * Dismissing the toast does NOT remove the id from the dedupe
//     set. The underlying notification record survives in the
//     Lantern; clicking it there marks it read.
//
// Visual style: matches CamperToastHost (bottom-center on mobile,
// bottom-right on >= sm). Same .camper-toast class for the slide-in
// animation. Up to 3 stacked; oldest drops off if a 4th arrives.

const POLL_INTERVAL_MS = 60_000
const MAX_TOASTS = 3

type NotificationType =
  | 'wave_sent'
  | 'wave_received'
  | 'wave_matched'
  | 'wave_connected'
  | 'new_message'
  | 'bulletin'
  | 'meetup_invite'
  | 'meetup_rsvp'

type NotificationRow = {
  id: string
  type: NotificationType
  reference_id: string | null
  message: string
}

type Toast = {
  // Unique React key + the notification id (used for dedupe + mark-read).
  notificationId: string
  type: NotificationType
  referenceId: string | null
  message: string
}

export function AppToastHost() {
  const router = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])
  const dedupeRef = useRef<Set<string>>(new Set())
  // Skip toasts on the very first poll -- those notifications were
  // already unread when the camper arrived, so they belong in the
  // Lantern + nav badges, not in a popup.
  const firstPollRef = useRef(true)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (cancelled) return
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible'
      ) {
        return
      }
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, reference_id, message')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50)
      if (cancelled || error || !data) return

      const rows = data as NotificationRow[]

      if (firstPollRef.current) {
        // Baseline seed -- everything currently unread is "already
        // known about." Don't pop toasts for them.
        for (const row of rows) dedupeRef.current.add(row.id)
        firstPollRef.current = false
        return
      }

      // Diff: any unread id not already in dedupe is a new arrival.
      // Walk oldest-first so the toast queue order matches the
      // arrival order, then trim to MAX_TOASTS at push time.
      const newArrivals = rows
        .filter((row) => !dedupeRef.current.has(row.id))
        .reverse()
      if (newArrivals.length === 0) return

      for (const row of newArrivals) dedupeRef.current.add(row.id)

      setToasts((prev) => {
        const incoming: Toast[] = newArrivals.map((row) => ({
          notificationId: row.id,
          type: row.type,
          referenceId: row.reference_id,
          message: row.message,
        }))
        const merged = [...prev, ...incoming]
        // Cap at MAX_TOASTS, keeping the most recent.
        return merged.length > MAX_TOASTS
          ? merged.slice(merged.length - MAX_TOASTS)
          : merged
      })
    }

    void poll()
    const timer = window.setInterval(poll, POLL_INTERVAL_MS)
    function onVisibility() {
      if (document.visibilityState === 'visible') void poll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  function dismiss(notificationId: string) {
    // Remove from the visible queue only. The notification record
    // stays in the Lantern + AppNav badge counters until the camper
    // explicitly marks it read.
    setToasts((prev) => prev.filter((t) => t.notificationId !== notificationId))
  }

  async function view(t: Toast) {
    // Mark read first so the Lantern + nav badges update on the
    // next poll. Then navigate. Drop the toast immediately so the
    // tray clears even before the route transition completes.
    dismiss(t.notificationId)
    void markNotificationReadAction(t.notificationId)
    const dest = destinationFor(t)
    if (dest) router.push(dest)
  }

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-50 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 w-[calc(100%-2rem)] max-w-sm sm:max-w-sm flex flex-col gap-2 pointer-events-none"
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.5rem)`,
      }}
    >
      {toasts.map((t) => (
        <AppToast
          key={t.notificationId}
          toast={t}
          onView={() => view(t)}
          onDismiss={() => dismiss(t.notificationId)}
        />
      ))}
    </div>
  )
}

// Visual treatment mirrors CamperToast (same .camper-toast class for
// the slide-in animation, same border / shadow / spacing). Keeps the
// camper-facing notification surface consistent across QR + (app)
// layer.
function AppToast({
  toast,
  onView,
  onDismiss,
}: {
  toast: Toast
  onView: () => void
  onDismiss: () => void
}) {
  const meta = COPY[toast.type]
  return (
    <div className="camper-toast pointer-events-auto rounded-2xl border border-flame/40 bg-night/95 shadow-2xl shadow-black/40 backdrop-blur px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-cream leading-snug min-w-0">
          <span aria-hidden className="mr-1.5">
            {meta.icon}
          </span>
          {meta.title}
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
      <p className="text-xs text-mist leading-snug line-clamp-2">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onView}
        className="inline-flex items-center gap-1 rounded-lg bg-flame/15 text-flame border border-flame/40 px-3 py-1.5 text-xs font-semibold hover:bg-flame/25 transition-colors"
      >
        {meta.cta} →
      </button>
    </div>
  )
}

const COPY: Record<NotificationType, { icon: string; title: string; cta: string }> = {
  wave_sent: { icon: '👋', title: 'Wave sent', cta: 'View' },
  wave_received: { icon: '👋', title: 'New wave for you', cta: 'View wave' },
  wave_matched: { icon: '🎉', title: 'Matched!', cta: 'Open' },
  wave_connected: { icon: '💬', title: 'Now connected', cta: 'Open chat' },
  new_message: { icon: '💬', title: 'New message', cta: 'Open chat' },
  bulletin: { icon: '📣', title: 'New announcement', cta: 'View' },
  meetup_invite: { icon: '📅', title: 'New meetup', cta: 'View meetup' },
  meetup_rsvp: { icon: '📅', title: 'Meetup RSVP', cta: 'View' },
}

function destinationFor(t: Toast): string | null {
  switch (t.type) {
    case 'wave_sent':
      return '/waves'
    case 'wave_received':
      return t.referenceId ? `/waves/incoming/${t.referenceId}` : '/waves'
    case 'wave_matched':
    case 'wave_connected':
    case 'new_message':
      return t.referenceId ? `/crossed-paths/${t.referenceId}` : '/crossed-paths'
    case 'bulletin':
      return '/bulletins'
    case 'meetup_invite':
    case 'meetup_rsvp':
      return '/meetups'
  }
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/(app)/notifications/actions'

// LIVE-APP lantern. Lives in the (app) layout header for authenticated
// users. Reads from public.notifications via the user-scoped Supabase
// client (RLS enforces user_id = auth.uid()). Triggers in migration
// 0025 populate the table on waves / matches / messages / bulletins /
// meetups.
//
// This is NOT the demo lantern — the demo-only "Your Lantern — waves,
// messages & meetup activity" caption never appears here, and the
// notifications are real.

type NotificationType =
  | 'wave_sent'
  | 'wave_received'
  | 'wave_matched'
  | 'wave_connected'
  | 'new_message'
  | 'bulletin'
  | 'meetup_invite'
  | 'meetup_rsvp'

type Notification = {
  id: string
  type: NotificationType
  reference_id: string | null
  campground_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

type BulletinPayload = {
  id: string
  campground_name: string
  message: string
  created_at: string
}

type Props = {
  /** Polling interval in ms. 0 disables polling. Default 60s. */
  pollIntervalMs?: number
}

const POLL_INTERVAL_DEFAULT = 60_000

export function AppLantern({ pollIntervalMs = POLL_INTERVAL_DEFAULT }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [activeBulletin, setActiveBulletin] = useState<BulletinPayload | null>(
    null,
  )
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  // Track last seen unread count so we can chirp on new arrivals only.
  const lastUnreadCountRef = useRef(0)

  // Fetch the most recent 20 notifications for the user. RLS scopes
  // automatically to auth.uid().
  const fetchNotifications = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, reference_id, campground_id, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      console.warn('[lantern] fetch failed:', error.message)
      return
    }
    setNotifications(data ?? [])
  }, [])

  // Initial fetch + polling. Polling stops when the page is hidden so we
  // aren't pinging the DB for a backgrounded tab.
  useEffect(() => {
    void fetchNotifications()
    if (pollIntervalMs <= 0) return
    let cancelled = false
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void fetchNotifications()
      }
    }, pollIntervalMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [fetchNotifications, pollIntervalMs])

  const unread = notifications.filter((n) => !n.is_read).length

  // Soft cricket chirp on new arrivals (delta against last fetch). Skip
  // first run so opening the page doesn't chirp immediately.
  const isInitialRef = useRef(true)
  useEffect(() => {
    if (isInitialRef.current) {
      lastUnreadCountRef.current = unread
      isInitialRef.current = false
      return
    }
    if (unread > lastUnreadCountRef.current) {
      void playCricketChirp()
    }
    lastUnreadCountRef.current = unread
  }, [unread])

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Click-outside closes the panel (mirrors QR Lantern's pattern).
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null
      if (!target) return
      if (buttonRef.current && buttonRef.current.contains(target)) return
      if (panelRef.current && panelRef.current.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  // Escape closes the bulletin overlay too.
  useEffect(() => {
    if (!activeBulletin) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveBulletin(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeBulletin])

  function closePanel() {
    setOpen(false)
  }

  function toggleOpen() {
    setOpen((prev) => !prev)
  }

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
    await markNotificationReadAction(id)
  }

  async function tapNotification(n: Notification) {
    // Bulletins open the card overlay. Don't mark read until the user
    // explicitly dismisses — same UX rule as the demo.
    if (n.type === 'bulletin') {
      // For the bulletin payload we display the notification message
      // (already prefixed with the campground name) plus the original
      // message body if we can fetch it. Keep the message short here
      // and rely on what the trigger inserted.
      const supabase = createSupabaseBrowserClient()
      let bullet: BulletinPayload | null = null
      if (n.reference_id) {
        const { data } = await supabase
          .from('bulletins')
          .select('id, message, created_at, campground_id')
          .eq('id', n.reference_id)
          .maybeSingle()
        if (data) {
          // Pull campground name via a separate lookup; the bulletin
          // RLS allows checked-in guests SELECT (see migration 0009).
          const { data: cg } = await supabase
            .from('campgrounds')
            .select('name')
            .eq('id', data.campground_id)
            .maybeSingle()
          bullet = {
            id: data.id,
            campground_name: cg?.name ?? 'Your campground',
            message: data.message,
            created_at: data.created_at,
          }
        }
      }
      // Fallback if the bulletin can't be loaded — render with what
      // the notification already carries.
      if (!bullet) {
        bullet = {
          id: n.reference_id ?? n.id,
          campground_name: 'Your campground',
          message: n.message.replace(/^📢 [^:]+:\s*/, ''),
          created_at: n.created_at,
        }
      }
      closePanel()
      setActiveBulletin(bullet)
      return
    }

    void markRead(n.id)

    switch (n.type) {
      case 'wave_sent':
        // Sender confirmation — no destination. Just collapse the panel.
        router.push('/waves')
        break
      case 'wave_received':
        // Receiver tap → the Wave Back / Ignore card.
        router.push(
          n.reference_id ? `/waves/incoming/${n.reference_id}` : '/waves',
        )
        break
      case 'wave_matched':
        // Mutual wave — open the consent prompt. The crossed-paths
        // detail page branches on status='pending_consent'.
        router.push(
          n.reference_id ? `/crossed-paths/${n.reference_id}` : '/crossed-paths',
        )
        break
      case 'wave_connected':
      case 'new_message':
        router.push(
          n.reference_id ? `/crossed-paths/${n.reference_id}` : '/crossed-paths',
        )
        break
      case 'meetup_invite':
      case 'meetup_rsvp':
        router.push('/meetups')
        break
    }
    closePanel()
  }

  async function dismissBulletin() {
    // Find the notification that opened this bulletin and mark it read.
    if (activeBulletin) {
      const match = notifications.find(
        (n) => n.type === 'bulletin' && n.reference_id === activeBulletin.id,
      )
      if (match) await markRead(match.id)
    }
    setActiveBulletin(null)
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await markAllNotificationsReadAction()
  }

  // QR-Lantern style: emoji button with .lantern-pulse when unread,
  // absolute-positioned dropdown panel constrained to viewport width
  // so it never overflows on narrow mobile screens. Same visual
  // treatment as src/components/campgrounds/lantern.tsx so the camper
  // sees the SAME Lantern across QR + signed-in surfaces.
  const buttonClass = unread > 0 ? 'lantern-pulse' : ''
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-label={
          unread > 0
            ? `Activity Lantern -- ${unread} new`
            : 'Activity Lantern'
        }
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors ${
          unread > 0
            ? 'bg-flame/15 border border-flame/40 text-flame hover:bg-flame/20'
            : 'border border-white/10 text-mist hover:text-cream hover:border-white/20'
        } ${buttonClass}`}
      >
        <span aria-hidden className="text-base leading-none">
          🏮
        </span>
        {unread > 0 && (
          <span className="text-[11px] font-semibold tabular-nums">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Recent notifications"
          // Viewport-anchored positioning so the 288px panel never
          // overflows the LEFT edge on narrow phones. The Lantern
          // button lives in a header flex row with siblings to its
          // right (Admin link, Sign out), so `absolute right-0`
          // (relative to the button's wrapper) cuts off on viewports
          // narrower than ~420px. `fixed right-4 top-16` pins the
          // panel to the viewport itself: 16px from the right edge,
          // 64px from the top (clears the 56px sticky header on
          // (app) routes + the static header on the QR page). Width
          // stays w-72 but caps at viewport-32px so it always fits
          // with margin on both sides.
          className="fixed right-4 top-16 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-card shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
              Activity
            </p>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] text-mist hover:text-flame underline-offset-2 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={closePanel}
                className="text-[11px] text-mist hover:text-cream underline-offset-2 hover:underline"
              >
                Close
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-mist">
              Nothing new yet. Wave at someone nearby or check in to a
              campground to get the lantern glowing.
            </p>
          ) : (
            <ul className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => tapNotification(n)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors flex items-start gap-3"
                  >
                    <span aria-hidden className="text-base leading-none mt-0.5">
                      {iconForType(n.type)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={
                          n.is_read
                            ? 'block text-sm font-semibold text-mist leading-tight'
                            : 'block text-sm font-semibold text-cream leading-tight'
                        }
                      >
                        {titleForType(n.type)}
                      </span>
                      <span
                        className={
                          n.is_read
                            ? 'block text-xs text-mist/70 mt-0.5 leading-snug line-clamp-2'
                            : 'block text-xs text-mist mt-0.5 leading-snug line-clamp-2'
                        }
                      >
                        {n.message}
                      </span>
                      <span className="block text-[10px] text-mist/70 mt-1 tabular-nums">
                        {formatTimestamp(n.created_at)}
                      </span>
                    </span>
                    {!n.is_read && (
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flame"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeBulletin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-bulletin-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-night/90 backdrop-blur px-4"
          onClick={dismissBulletin}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-flame/40 bg-card p-6 shadow-2xl shadow-black/70 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-mist">
              Campground Bulletin
            </p>
            <div className="flex items-center gap-2">
              <h2
                id="app-bulletin-title"
                className="font-display text-xl font-extrabold text-cream"
              >
                {activeBulletin.campground_name}
              </h2>
              <VerifiedCheck className="h-5 w-5 shrink-0" />
            </div>
            <p className="text-sm text-cream leading-relaxed whitespace-pre-line">
              {activeBulletin.message}
            </p>
            <p className="text-[11px] text-mist">
              Posted {formatTimestamp(activeBulletin.created_at)}
            </p>
            <button
              type="button"
              onClick={dismissBulletin}
              className="w-full rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              Dismiss
            </button>
            <p className="text-center text-[10px] text-mist/70 leading-snug">
              Campground bulletins are posted by verified campground
              staff only.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Human-friendly title for each NotificationType -- shown above the
// raw `message` body in the Lantern panel so the camper can scan by
// kind without reading the full text.
function titleForType(t: NotificationType): string {
  switch (t) {
    case 'wave_sent':
      return 'Wave sent'
    case 'wave_received':
      return 'New wave for you'
    case 'wave_matched':
      return 'Matched 🎉'
    case 'wave_connected':
      return 'Now connected'
    case 'new_message':
      return 'New message'
    case 'bulletin':
      return 'New announcement'
    case 'meetup_invite':
      return 'New meetup'
    case 'meetup_rsvp':
      return 'Meetup RSVP'
  }
}

function iconForType(t: NotificationType): string {
  switch (t) {
    case 'wave_sent':
    case 'wave_received':
    case 'wave_matched':
    case 'wave_connected':
      return '👋'
    case 'new_message':
      return '💬'
    case 'bulletin':
      return '📣'
    case 'meetup_invite':
    case 'meetup_rsvp':
      return '📅'
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return `today at ${d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function VerifiedCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified campground"
      role="img"
    >
      <path
        d="M12 2l2.39 1.74 2.96-.34 1.13 2.76 2.52 1.6-.6 2.92.6 2.92-2.52 1.6-1.13 2.76-2.96-.34L12 22l-2.39-1.74-2.96.34-1.13-2.76-2.52-1.6.6-2.92-.6-2.92 2.52-1.6 1.13-2.76 2.96.34L12 2z"
        fill="#f59e0b"
      />
      <path
        d="M8.5 12.2l2.4 2.4 4.6-5"
        stroke="#0a0f1c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

async function playCricketChirp() {
  if (typeof window === 'undefined') return
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    const now = ctx.currentTime
    chirp(ctx, now, 4500, 5500, 0.04)
    chirp(ctx, now + 0.18, 4500, 5500, 0.035)
    window.setTimeout(() => ctx.close().catch(() => {}), 800)
  } catch {
    // Audio policy denied — silent fail.
  }
}

function chirp(
  ctx: AudioContext,
  startAt: number,
  startFreq: number,
  endFreq: number,
  peakGain: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain).connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(startFreq, startAt)
  osc.frequency.exponentialRampToValueAtTime(endFreq, startAt + 0.05)
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14)
  osc.start(startAt)
  osc.stop(startAt + 0.16)
}

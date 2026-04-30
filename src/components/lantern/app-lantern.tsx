'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
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
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeBulletin, setActiveBulletin] = useState<BulletinPayload | null>(
    null,
  )
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  // Track last seen unread count so we can chirp on new arrivals only.
  const lastUnreadCountRef = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Escape closes the bulletin overlay too.
  useEffect(() => {
    if (!activeBulletin) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveBulletin(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeBulletin])

  function openPanel() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      // Anchor below the button. Clamp `right` so the 320px-wide
      // panel never overflows the LEFT edge on narrow viewports —
      // if the button is far from the right edge of the viewport
      // (e.g., header padding + adjacent buttons), the natural
      // `right = innerWidth - rect.right` would push the panel
      // past the screen's left side. Cap it so the panel always
      // fits (or shrinks via max-width).
      const PANEL = 320
      const SAFE = 8
      const desiredRight = Math.round(window.innerWidth - rect.right)
      const maxRight = Math.max(SAFE, window.innerWidth - PANEL - SAFE)
      setPos({
        top: Math.round(rect.bottom + 8),
        right: Math.max(SAFE, Math.min(desiredRight, maxRight)),
      })
    } else {
      setPos({ top: 56, right: 12 })
    }
    setOpen(true)
  }

  function closePanel() {
    setOpen(false)
  }

  function toggleOpen() {
    if (open) closePanel()
    else openPanel()
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications — tap to see activity"
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          unread > 0
            ? 'group relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-shadow shadow-[0_0_14px_3px_rgba(245,158,11,0.45)] hover:shadow-[0_0_18px_4px_rgba(245,158,11,0.55)]'
            : 'group relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-shadow hover:shadow-[0_0_10px_2px_rgba(245,158,11,0.25)]'
        }
        data-unread={unread}
      >
        <LanternIcon className="h-5 w-5" lit={unread > 0} />
        <span
          aria-hidden
          className="hidden md:group-hover:block absolute top-full mt-2 right-0 whitespace-nowrap rounded-md border border-flame/40 bg-night px-2 py-1 text-[10px] font-medium text-cream pointer-events-none z-10"
        >
          Your Lantern — tap to see activity
        </span>
      </button>

      {mounted && open && pos
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={closePanel}
                className="fixed inset-0 z-[100] cursor-default bg-transparent"
              />
              <div
                role="menu"
                aria-label="Notifications"
                style={{ top: pos.top, right: pos.right }}
                className="fixed w-80 max-w-[calc(100vw-1rem)] z-[101] rounded-2xl border border-white/10 bg-card p-2 shadow-2xl shadow-black/60"
              >
                <div className="px-2 pt-1.5 pb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-flame">
                    Activity
                  </p>
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-[11px] text-mist hover:text-flame underline-offset-2 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-mist">
                    Nothing new yet. Wave at someone nearby to get the lantern
                    glowing.
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => tapNotification(n)}
                          className={
                            n.is_read
                              ? 'w-full text-left rounded-lg px-3 py-2 text-sm text-mist hover:bg-white/[0.03] transition-colors'
                              : 'w-full text-left rounded-lg px-3 py-2 text-sm text-cream hover:bg-flame/10 transition-colors'
                          }
                        >
                          <span className="flex items-start gap-2">
                            {!n.is_read && (
                              <span
                                aria-hidden
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flame"
                              />
                            )}
                            <span className={n.is_read ? 'opacity-70' : ''}>
                              {n.message}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>,
            document.body,
          )
        : null}

      {mounted && activeBulletin
        ? createPortal(
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
            </div>,
            document.body,
          )
        : null}
    </>
  )
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

// Inline lantern SVG (same shape as the demo, kept here so the live app
// has zero demo-component dependencies).
function LanternIcon({
  className,
  lit,
}: {
  className?: string
  lit: boolean
}) {
  const flameFill = lit ? '#f59e0b' : '#94a3b8'
  const bodyStroke = lit ? '#f5ecd9' : '#94a3b8'
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 3c-1.5 0-2.5 1-2.5 2"
        stroke={bodyStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 3c1.5 0 2.5 1 2.5 2"
        stroke={bodyStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="5"
        width="8"
        height="2"
        rx="0.5"
        stroke={bodyStroke}
        strokeWidth="1.3"
      />
      <rect
        x="7"
        y="7"
        width="10"
        height="11"
        rx="1.2"
        stroke={bodyStroke}
        strokeWidth="1.3"
      />
      <path
        d="M12 10c-1.2 1-1.6 2.2-1 3.3.4.7 1.1 1 1 2-.7-.3-1.2-.9-1.4-1.7-.6.7-.7 1.6-.2 2.5C11 16.7 11.5 17 12 17s1-.3 1.6-1c.5-.9.4-1.8-.2-2.5-.2.8-.7 1.4-1.4 1.7-.1-1 .6-1.3 1-2 .6-1.1.2-2.3-1-3.2z"
        fill={flameFill}
      />
      <rect
        x="8.5"
        y="18"
        width="7"
        height="2"
        rx="0.4"
        stroke={bodyStroke}
        strokeWidth="1.3"
      />
    </svg>
  )
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

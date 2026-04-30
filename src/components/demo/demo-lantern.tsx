'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// DEMO-ONLY component. The real authenticated app does not import this.
// Renders a small lantern icon in the demo nav with three hardcoded
// notifications, an amber glow when there's unread activity, a desktop
// hover tooltip, and a soft cricket chirp when the panel opens. The
// hardcoded notifications are intentionally fake — never pull from the
// real database.

type DemoNotification = {
  id: string
  text: string
  /** Demo screen id to route to when tapped, if any. */
  target: string | null
}

const NOTIFICATIONS: DemoNotification[] = [
  { id: 'wave-1', text: 'CampingFan42 sent you a wave 🏕️', target: 'waves' },
  {
    id: 'match-1',
    text: 'You matched with OutdoorMike! Say hello 👋',
    target: 'paths',
  },
  {
    id: 'meetup-1',
    text: 'New meetup: Campfire Night at Site Loop B — Tonight at 7pm 🔥',
    target: 'meetups',
  },
]

type Props = {
  /**
   * Optional handler for when a notification points at a demo screen.
   * Receives the screen id (e.g. 'waves'). When omitted, a tap just
   * marks the notification as read.
   */
  onNavigate?: (screen: string) => void
}

type PanelPos = { top: number; right: number }

export function DemoLantern({ onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [pos, setPos] = useState<PanelPos | null>(null)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // Only portal after mount — keeps SSR clean (no document reference at
  // render time, no hydration mismatch).
  useEffect(() => {
    setMounted(true)
  }, [])

  // Escape key closes the panel. The visual backdrop handles outside
  // taps; we don't attach a document-level mousedown listener because
  // it raced with mobile touch synthesis on iOS Safari and could keep
  // the panel from closing reliably.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const unread = NOTIFICATIONS.filter((n) => !readIds.has(n.id)).length

  function openPanel() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      // Anchor the panel below the button's bottom edge, right-aligned
      // to the button's right edge. Use viewport coords so the portal-
      // rendered fixed panel lines up correctly.
      setPos({
        top: Math.round(rect.bottom + 8),
        right: Math.round(window.innerWidth - rect.right),
      })
    } else {
      // Fallback for the rare case where the ref isn't attached yet:
      // just float in the upper-right corner.
      setPos({ top: 56, right: 12 })
    }
    void playCricketChirp()
    setOpen(true)
  }

  function closePanel() {
    setOpen(false)
  }

  function toggleOpen() {
    if (open) closePanel()
    else openPanel()
  }

  function tapNotification(n: DemoNotification) {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(n.id)
      return next
    })
    if (n.target && onNavigate) {
      onNavigate(n.target)
      closePanel()
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-label="Your Lantern — tap to see activity"
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          unread > 0
            ? 'group relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-shadow shadow-[0_0_14px_3px_rgba(245,158,11,0.45)] hover:shadow-[0_0_18px_4px_rgba(245,158,11,0.55)]'
            : 'group relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-shadow hover:shadow-[0_0_10px_2px_rgba(245,158,11,0.25)]'
        }
      >
        <LanternIcon className="h-5 w-5" lit={unread > 0} />
        {/* Desktop-only hover tooltip. Hidden on touch via the md:
            breakpoint and by display:none. pointer-events:none so it
            never intercepts clicks on its own. */}
        <span
          aria-hidden
          className="hidden md:group-hover:block absolute top-full mt-2 right-0 whitespace-nowrap rounded-md border border-flame/40 bg-night px-2 py-1 text-[10px] font-medium text-cream pointer-events-none z-10"
        >
          Your Lantern — tap to see activity
        </span>
      </button>

      {/* When closed, render NOTHING outside the button. No backdrop,
          no panel, no hidden overlay. When open, portal the backdrop +
          panel to document.body so they sit at the top of the stacking
          order and can't get trapped behind the demo's phone-frame
          chrome or any other positioning context. */}
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
                aria-label="Demo notifications"
                style={{ top: pos.top, right: pos.right }}
                className="fixed w-72 max-w-[calc(100vw-1.5rem)] z-[101] rounded-2xl border border-white/10 bg-card p-2 shadow-2xl shadow-black/60"
              >
                <p className="px-2 pt-1.5 pb-2 text-[10px] uppercase tracking-[0.2em] text-flame">
                  Activity
                </p>
                <ul className="space-y-1">
                  {NOTIFICATIONS.map((n) => {
                    const read = readIds.has(n.id)
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => tapNotification(n)}
                          className={
                            read
                              ? 'w-full text-left rounded-lg px-3 py-2 text-sm text-mist hover:bg-white/[0.03] transition-colors'
                              : 'w-full text-left rounded-lg px-3 py-2 text-sm text-cream hover:bg-flame/10 transition-colors'
                          }
                        >
                          <span className="flex items-start gap-2">
                            {!read && (
                              <span
                                aria-hidden
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-flame"
                              />
                            )}
                            <span className={read ? 'opacity-70' : ''}>
                              {n.text}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="px-3 pt-2 pb-1 text-[10px] text-mist/60">
                  Demo activity — not from your real account.
                </p>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}

// Inline lantern SVG — small, theme-friendly, no asset dependency. The
// `lit` prop swaps the flame fill so the icon visibly differs by state.
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

// Soft synthesized cricket chirp via WebAudio — no asset to ship, no
// licensing. Two short modulated tones at ~4.5 kHz with a quick decay.
// Wrapped in try/catch because mobile autoplay policies will reject
// AudioContext creation if there hasn't been a user gesture yet.
async function playCricketChirp() {
  if (typeof window === 'undefined') return
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }
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

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Eye,
  EyeOff,
  Ghost,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'

// ----------------------------------------------------------------------------
// Slide data
// ----------------------------------------------------------------------------

type SlideId =
  | 'arrive'
  | 'vibe'
  | 'privacy'
  | 'invisible'
  | 'nearby'
  | 'wave'
  | 'magic'
  | 'meetup'
  | 'paths'

type Slide = {
  id: SlideId
  title: string
  narration: string
}

const SLIDES: Slide[] = [
  {
    id: 'arrive',
    title: 'You Just Pulled In',
    narration:
      "Hey there, neighbor! I'm Riley — your RoadWave campground host. Pull up a chair, because I'm about to show you everything this app can do. It's gonna make your whole camping experience feel like coming home.",
  },
  {
    id: 'vibe',
    title: 'Pick Your Vibe',
    narration:
      "First, pick your vibe. Are you a full-timer? A weekender? A solo wolf? It helps you find the right kind of neighbors.",
  },
  {
    id: 'privacy',
    title: 'Set Your Privacy',
    narration:
      "You're always in control. Three privacy modes mean you choose how visible you want to be in any campground.",
  },
  {
    id: 'invisible',
    title: 'Go Invisible',
    narration:
      "Need quiet time? Go Invisible. You can browse the area, but no one can see you. Pure ghost mode, judgment-free.",
  },
  {
    id: 'nearby',
    title: "See Who's Around",
    narration:
      "Open your nearby list and see who else is checked in right now. Filter by interests or travel style to find your kind of people.",
  },
  {
    id: 'wave',
    title: 'Send a Wave',
    narration:
      "Spot someone interesting? Send a wave. No messages. No awkwardness. Just a friendly hello across the campground.",
  },
  {
    id: 'magic',
    title: 'Wave Back = Magic',
    narration:
      "When they wave back, magic happens. You've crossed paths. Now it's official, and the awkward part is already done.",
  },
  {
    id: 'meetup',
    title: 'Plan a Meetup',
    narration:
      "Hosts post meetups for the whole campground. Coffee at nine, fire ring at seven. Show up if you want — no pressure either way.",
  },
  {
    id: 'paths',
    title: 'Crossed Paths',
    narration:
      "Every mutual wave becomes a crossed path. Your network of campground friends, ready when you roll back through.",
  },
]

const STORAGE_MUTE = 'roadwave-tour-muted'
const STORAGE_ENABLED = 'roadwave-tour-enabled-slides'

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

type Props = {
  /** Show the "← Exit" link in the header (true on the standalone /tour page,
   *  false when embedded inline on the homepage). */
  showExit?: boolean
  /** Listen for ArrowLeft/ArrowRight keys at the window level. Only the
   *  standalone variant should do this — keyboard nav on the homepage would
   *  hijack arrows while users scroll the page. */
  enableKeyboard?: boolean
}

export function RileyTour({ showExit = false, enableKeyboard = false }: Props) {
  const [enabledIds, setEnabledIds] = useState<Set<SlideId>>(
    () => new Set(SLIDES.map((s) => s.id)),
  )
  const enabledSlides = SLIDES.filter((s) => enabledIds.has(s.id))

  const [index, setIndex] = useState(0)
  const safeIndex = Math.min(index, Math.max(enabledSlides.length - 1, 0))
  const slide = enabledSlides[safeIndex] ?? SLIDES[0]
  const total = enabledSlides.length

  const [muted, setMuted] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Hydrate persisted prefs.
  useEffect(() => {
    const m = localStorage.getItem(STORAGE_MUTE)
    const e = localStorage.getItem(STORAGE_ENABLED)
    let nextMuted = false
    let nextEnabled: Set<SlideId> | null = null
    if (m === 'true') nextMuted = true
    else if (m === null) {
      nextMuted = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    if (e) {
      try {
        const arr = JSON.parse(e) as string[]
        const validIds = new Set(SLIDES.map((s) => s.id))
        const filtered = arr.filter((id): id is SlideId =>
          validIds.has(id as SlideId),
        )
        if (filtered.length > 0) nextEnabled = new Set(filtered)
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a non-React store
    if (nextMuted) setMuted(true)
    if (nextEnabled) setEnabledIds(nextEnabled)
  }, [])

  // Persist mute.
  useEffect(() => {
    localStorage.setItem(STORAGE_MUTE, String(muted))
  }, [muted])

  // Persist enabled set.
  useEffect(() => {
    localStorage.setItem(STORAGE_ENABLED, JSON.stringify([...enabledIds]))
  }, [enabledIds])

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1))
  }, [total])

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  // Keyboard nav (only when explicitly enabled).
  useEffect(() => {
    if (!enableKeyboard) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape' && showSettings) setShowSettings(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enableKeyboard, next, prev, showSettings])

  // ElevenLabs narration on slide change.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (muted || !slide) return

    const controller = new AbortController()
    let cancelled = false
    let blobUrl: string | null = null
    let audio: HTMLAudioElement | null = null

    ;(async () => {
      try {
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: slide.narration }),
          signal: controller.signal,
        })
        if (cancelled || !res.ok) return
        const blob = await res.blob()
        if (cancelled) return
        blobUrl = URL.createObjectURL(blob)
        audio = new Audio(blobUrl)
        audioRef.current = audio
        const cleanup = () => {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
            blobUrl = null
          }
        }
        audio.addEventListener('ended', cleanup)
        audio.addEventListener('error', cleanup)
        await audio.play().catch(() => {})
      } catch {
        // aborted, network error, or upstream failure — silent
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      if (audio) audio.pause()
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        blobUrl = null
      }
      audioRef.current = null
    }
  }, [slide, muted])

  function toggleSlide(id: SlideId) {
    setEnabledIds((prev) => {
      const nextSet = new Set(prev)
      if (nextSet.has(id)) {
        if (nextSet.size === 1) return prev
        nextSet.delete(id)
      } else {
        nextSet.add(id)
      }
      return nextSet
    })
    setIndex((i) => Math.min(i, Math.max(0, enabledSlides.length - 1)))
  }

  const isLast = safeIndex === total - 1

  return (
    <div className="flex flex-col">
      <TourStyles />

      {/* Header — exit (standalone) or just controls (inline) */}
      <header
        className={
          showExit
            ? 'px-4 py-3 flex items-center justify-between border-b border-white/5'
            : 'px-2 py-2 flex items-center justify-end'
        }
      >
        {showExit && (
          <Link
            href="/"
            className="text-sm text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            ← Exit
          </Link>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="grid h-9 w-9 place-items-center rounded-full text-mist hover:text-cream hover:bg-white/5 transition-colors"
            aria-label={muted ? 'Unmute Riley' : 'Mute Riley'}
            aria-pressed={muted}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="grid h-9 w-9 place-items-center rounded-full text-mist hover:text-cream hover:bg-white/5 transition-colors"
            aria-label="Customize slides"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Progress dots */}
      <div className="flex justify-center items-center gap-1.5 py-3">
        {enabledSlides.map((s, i) => (
          <span
            key={s.id}
            className={
              i === safeIndex
                ? 'h-2 w-6 rounded-full bg-flame transition-all duration-300'
                : i < safeIndex
                  ? 'h-2 w-2 rounded-full bg-flame/50 transition-all duration-300'
                  : 'h-2 w-2 rounded-full bg-white/15 transition-all duration-300'
            }
            aria-hidden
          />
        ))}
      </div>

      {/* Nav row (top) — Back / Next on non-last; CTA on last */}
      <div className="px-4 pb-4 max-w-md w-full mx-auto flex items-center gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={safeIndex === 0}
          className="rounded-xl border border-flame/40 bg-transparent text-flame px-4 py-2 text-sm font-semibold hover:bg-flame/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <div className="flex-1" />
        {!isLast ? (
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-flame text-night px-5 py-2 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
          >
            Next
          </button>
        ) : (
          <CtaRow />
        )}
      </div>

      {/* Riley + speech bubble + phone mockup */}
      <section className="px-4 pb-4">
        <div
          key={slide.id}
          className="slide-enter mx-auto w-full max-w-md flex flex-col items-center gap-4 sm:gap-5"
        >
          {/* Riley avatar — clean, no overlay text */}
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-2 border-flame/40 bg-card shadow-lg shadow-flame/10">
            {imgError ? (
              <div className="w-full h-full grid place-items-center bg-flame/15 text-4xl">
                🏕️
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- onError fallback to emoji needs <img>
              <img
                src="/riley.png"
                alt="Riley, your campground host"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          {/* Speech bubble */}
          <div className="relative w-full mt-1">
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-card border-l border-t border-flame/20"
              aria-hidden
            />
            <div className="rounded-2xl border border-flame/20 bg-card px-4 py-3 sm:px-5 sm:py-4 shadow-lg shadow-black/30">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame text-center mb-1">
                {slide.title}
              </p>
              <p className="font-serif italic text-flame text-base sm:text-lg leading-snug text-center">
                &ldquo;{slide.narration}&rdquo;
              </p>
            </div>
          </div>

          {/* Phone mockup */}
          <PhoneFrame>
            <SlideMockup id={slide.id} />
          </PhoneFrame>
        </div>
      </section>

      {showSettings && (
        <SettingsDrawer
          enabledIds={enabledIds}
          onToggle={toggleSlide}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// CTA row (last slide)
// ----------------------------------------------------------------------------

function CtaRow() {
  return (
    <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:flex-initial">
      <Link
        href="/signup"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-2 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
      >
        Get Started <span aria-hidden>👋</span>
      </Link>
      <Link
        href="/demo"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-4 py-2 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
      >
        Try the Demo →
      </Link>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Settings drawer
// ----------------------------------------------------------------------------

function SettingsDrawer({
  enabledIds,
  onToggle,
  onClose,
}: {
  enabledIds: Set<SlideId>
  onToggle: (id: SlideId) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-5 space-y-4 shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-flame">
            Customize slides
          </p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-mist hover:text-cream hover:bg-white/5"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="font-serif italic text-flame text-base leading-snug">
          Toggle slides on or off. At least one must stay visible.
        </p>
        <ul className="space-y-1.5">
          {SLIDES.map((s) => {
            const active = enabledIds.has(s.id)
            return (
              <li key={s.id}>
                <label
                  className={
                    active
                      ? 'flex items-center gap-3 rounded-lg border border-flame/40 bg-flame/10 px-3 py-2 cursor-pointer'
                      : 'flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer'
                  }
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggle(s.id)}
                    className="h-4 w-4 accent-flame"
                  />
                  <span className="text-sm text-cream">{s.title}</span>
                </label>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-flame text-night px-4 py-2 font-semibold hover:bg-amber-400"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Phone frame + slide mockups
// ----------------------------------------------------------------------------

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-[2rem] border-[7px] border-black bg-night shadow-2xl shadow-black/60 overflow-hidden"
      style={{ width: 220, aspectRatio: '9 / 19.5' }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-black rounded-b-2xl z-10"
        aria-hidden
      />
      <div className="absolute inset-0 overflow-y-auto pt-6 pb-2 px-2">
        <div className="rounded-[1.5rem] bg-night min-h-full p-2">{children}</div>
      </div>
    </div>
  )
}

function SlideMockup({ id }: { id: SlideId }) {
  switch (id) {
    case 'arrive':
      return <ArriveMockup />
    case 'vibe':
      return <VibeMockup />
    case 'privacy':
      return <PrivacyMockup />
    case 'invisible':
      return <InvisibleMockup />
    case 'nearby':
      return <NearbyMockup />
    case 'wave':
      return <WaveMockup />
    case 'magic':
      return <MagicMockup />
    case 'meetup':
      return <MeetupMockup />
    case 'paths':
      return <PathsMockup />
  }
}

function MockupHeader({ title }: { title: string }) {
  return (
    <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-flame mb-2">
      {title}
    </p>
  )
}

function ArriveMockup() {
  return (
    <div>
      <MockupHeader title="Welcome" />
      <h3 className="font-display text-base font-extrabold leading-tight mb-2">
        You just pulled in.
      </h3>
      <div className="rounded-xl border border-flame/30 bg-flame/10 p-2.5 mb-3">
        <p className="text-[8px] uppercase tracking-wider text-flame">Check in to</p>
        <p className="font-semibold text-cream text-sm leading-tight">
          Riverbend RV Park
        </p>
        <p className="text-[10px] text-mist">Asheville, NC</p>
      </div>
      <button className="w-full rounded-lg bg-flame text-night px-2 py-1.5 text-[11px] font-semibold inline-flex justify-center items-center gap-1">
        Check in <span aria-hidden>👋</span>
      </button>
    </div>
  )
}

function VibeMockup() {
  const styles = ['Full-timer', 'Weekender', 'Snowbird', 'Solo', 'Family', 'Quiet']
  return (
    <div>
      <MockupHeader title="Travel style" />
      <p className="text-[10px] text-mist mb-2 leading-snug">
        Pick what fits today.
      </p>
      <div className="flex flex-wrap gap-1">
        {styles.map((s, i) => (
          <span
            key={s}
            className={
              i === 0
                ? 'rounded-full bg-flame text-night px-2 py-0.5 text-[9px] font-semibold'
                : 'rounded-full border border-white/10 bg-white/5 text-cream px-2 py-0.5 text-[9px]'
            }
          >
            {s}
          </span>
        ))}
      </div>
      <p className="text-[9px] text-mist mt-2">+ 4 more</p>
    </div>
  )
}

function PrivacyMockup() {
  const modes = [
    { Icon: Eye, label: 'Visible', sub: 'In the list', selected: true },
    { Icon: EyeOff, label: 'Quiet', sub: 'Hidden, can wave', selected: false },
    { Icon: Ghost, label: 'Invisible', sub: 'Pure observer', selected: false },
  ]
  return (
    <div>
      <MockupHeader title="Privacy" />
      <div className="space-y-1.5">
        {modes.map(({ Icon, label, sub, selected }) => (
          <div
            key={label}
            className={
              selected
                ? 'flex items-center gap-2 rounded-lg border border-flame bg-flame/10 px-2 py-1.5'
                : 'flex items-center gap-2 rounded-lg border border-white/10 bg-card px-2 py-1.5'
            }
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-flame/15 text-flame">
              <Icon className="h-3 w-3" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold leading-tight">{label}</p>
              <p className="text-[9px] text-mist leading-tight">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvisibleMockup() {
  return (
    <div>
      <MockupHeader title="Status" />
      <div className="rounded-xl border border-white/10 bg-card p-3 text-center space-y-2">
        <Ghost className="mx-auto h-10 w-10 text-flame" aria-hidden />
        <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
          You are invisible
        </p>
        <p className="text-[10px] text-mist leading-snug">
          Browse around. Nobody sees you. Tap anywhere to flip back.
        </p>
      </div>
      <p className="font-serif italic text-flame text-[10px] mt-3 text-center leading-snug">
        A very well-rested ghost.
      </p>
    </div>
  )
}

const SAMPLE_NEARBY = [
  {
    name: 'Sarah & Jim',
    username: 'rolling_pines',
    style: 'Full-timer',
    interests: ['☕', '🔥'],
  },
  {
    name: 'Alex',
    username: 'wandering_alex',
    style: 'Weekender',
    interests: ['🥾', '🎵'],
  },
  {
    name: 'Jordan',
    username: 'jordan_solo',
    style: 'Solo',
    interests: ['🏄', '⚡'],
  },
]

function NearbyMockup() {
  return (
    <div>
      <MockupHeader title="Nearby campers" />
      <div className="space-y-1.5">
        {SAMPLE_NEARBY.map((c) => (
          <div
            key={c.username}
            className="rounded-lg border border-white/5 bg-card p-2"
          >
            <p className="text-[11px] font-semibold leading-tight">{c.name}</p>
            <p className="text-[9px] text-mist leading-tight">@{c.username}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="rounded-full border border-flame/30 bg-flame/10 px-1.5 py-0.5 text-[9px] font-semibold text-flame">
                {c.style}
              </span>
              <span className="text-[10px]">{c.interests.join(' ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WaveMockup() {
  return (
    <div>
      <MockupHeader title="Sarah & Jim" />
      <div className="rounded-lg border border-white/5 bg-card p-2.5 mb-2">
        <p className="text-[11px] font-semibold leading-tight">Sarah & Jim</p>
        <p className="text-[9px] text-mist">@rolling_pines</p>
        <span className="mt-1 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-1.5 py-0.5 text-[9px] font-semibold text-flame">
          Full-timer
        </span>
        <p className="font-serif italic text-flame text-[10px] mt-1.5 leading-snug">
          &ldquo;Coffee on the porch · come say hi&rdquo;
        </p>
      </div>
      <button className="w-full inline-flex justify-center items-center gap-1 rounded-md bg-flame text-night px-2 py-2 text-[12px] font-semibold shadow shadow-flame/20">
        Wave <span aria-hidden>👋</span>
      </button>
    </div>
  )
}

function MagicMockup() {
  return (
    <div>
      <MockupHeader title="It's a match" />
      <div className="rounded-xl border border-flame/40 bg-flame/15 p-3 text-center space-y-1.5">
        <p className="text-2xl leading-none">👋👋</p>
        <p className="font-display text-base font-extrabold leading-tight">
          Crossed paths!
        </p>
        <p className="text-[10px] text-cream/85 leading-snug">
          You and <span className="font-semibold">Sarah & Jim</span> waved at
          each other.
        </p>
      </div>
      <p className="font-serif italic text-flame text-[10px] mt-3 text-center leading-snug">
        The awkward part is already done.
      </p>
    </div>
  )
}

function MeetupMockup() {
  return (
    <div>
      <MockupHeader title="Tonight" />
      <div className="rounded-lg border border-white/5 bg-card p-2.5">
        <p className="text-[12px] font-semibold leading-tight">Sunset campfire</p>
        <p className="text-[9px] text-mist mt-0.5">Tonight · 7:30 PM</p>
        <span className="mt-1.5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-cream">
          Fire ring 3
        </span>
        <p className="text-[10px] text-cream/85 mt-1.5 leading-snug">
          Bring a chair. Hot cocoa.
        </p>
        <div className="mt-2 flex items-center gap-2 text-[9px] text-mist">
          <span>4 RSVPs</span>
        </div>
      </div>
      <button className="w-full mt-2 rounded-md border border-flame/40 bg-flame/10 text-flame px-2 py-1.5 text-[11px] font-semibold">
        I&apos;m in
      </button>
    </div>
  )
}

function PathsMockup() {
  const matches = [
    { name: 'Sarah & Jim', when: '2 days ago', where: 'Riverbend' },
    { name: 'Alex', when: '1 week ago', where: 'Coastal Pines' },
  ]
  return (
    <div>
      <MockupHeader title="Crossed paths" />
      <div className="space-y-1.5">
        {matches.map((m) => (
          <div
            key={m.name}
            className="rounded-lg border border-flame/30 bg-card p-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold leading-tight">{m.name}</p>
              <span aria-hidden className="text-xs">
                👋
              </span>
            </div>
            <p className="text-[9px] text-mist leading-tight">
              {m.where} · {m.when}
            </p>
          </div>
        ))}
      </div>
      <p className="font-serif italic text-flame text-[10px] mt-3 leading-snug text-center">
        Your campground network.
      </p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Animations
// ----------------------------------------------------------------------------

function TourStyles() {
  return (
    <style>{`
      @keyframes slide-enter {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .slide-enter { animation: slide-enter 0.4s ease-out both; }

      @media (prefers-reduced-motion: reduce) {
        .slide-enter { animation: none; }
      }
    `}</style>
  )
}

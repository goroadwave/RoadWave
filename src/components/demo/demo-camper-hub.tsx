'use client'

import { useState, useEffect, useRef } from 'react'

// Polished standalone camper QR experience for the RoadWave Demo
// Center. Renders ALL the surfaces a real camper sees after
// scanning a campground's QR code, but every byte is mock data
// kept in this file -- no DB, no API, no auth, no realtime.
//
// Interactive bits use local React state:
//   * Lantern button opens a notification panel.
//   * "Send a Wave" button on a camper card transitions
//     waiting -> matched -> conversation in ~1.5s.
//   * Office message form posts a fake message, the demo fakes
//     a 1s typing delay then a canned owner reply.
//
// Visual structure mirrors the real /campground/[slug] page so a
// prospect sees the actual product, not a generic mockup. Reuses
// the brand styling tokens (text-flame, bg-card, rounded-2xl
// border border-white/5 pattern) used elsewhere in the app.

// ---------------------------------------------------------------
// Mock data -- everything below is fake, never persisted.
// ---------------------------------------------------------------

const CAMPGROUND = {
  name: 'Pine Ridge RV Resort',
  address: '1247 Lakeshore Drive · Pine Ridge, CO 80498',
  phone: '(555) 234-9876',
  wifi: {
    network: 'PineRidge-Guest',
    password: 'pinecone2026',
    notes: 'Strongest near the clubhouse and sites 1–24.',
  },
  amenities: [
    '☕ Coffee bar (6 AM)',
    '🏊 Pool (9 AM – 9 PM)',
    '🐕 Off-leash dog park',
    '🔥 Communal fire pits',
    '📶 Free guest Wi-Fi',
    '🚿 Bathhouse',
    '🧺 Laundry',
    '🛒 Camp store',
  ],
  rules: [
    'Quiet hours 10 PM – 7 AM',
    'Speed limit 10 MPH inside the park',
    'Pets leashed outside the dog park',
    'Fires in designated rings only',
  ],
  checkInTime: '2:00 PM',
  checkOutTime: '11:00 AM',
}

const BULLETINS = [
  {
    id: 'b1',
    message: 'Pool hours updated this weekend: 8 AM – 10 PM Fri/Sat.',
    when: '2 hours ago',
  },
  {
    id: 'b2',
    message:
      'Food truck tonight! Tacos by the clubhouse from 5–8 PM. Cash + cards welcome.',
    when: 'this morning',
  },
  {
    id: 'b3',
    message:
      'Reminder: quiet hours start at 10 PM. Generators off, music down, fires low.',
    when: 'yesterday',
  },
]

const MEETUPS = [
  {
    id: 'm1',
    title: 'Coffee at the pavilion',
    when: 'Tomorrow · 9:00 AM',
    location: 'Pavilion by the pool',
    description: 'Casual coffee. Come say hello.',
  },
  {
    id: 'm2',
    title: 'Sunset walk',
    when: 'Tonight · 7:30 PM',
    location: 'Lakeshore trail',
    description: 'Easy 1.5 mile loop. Dogs welcome.',
  },
  {
    id: 'm3',
    title: 'Campfire meetup',
    when: 'Tonight · 9:00 PM',
    location: 'Communal fire ring 3',
    description: 'Bring a chair, hot cocoa provided.',
  },
  {
    id: 'm4',
    title: 'Morning dog walk',
    when: 'Tomorrow · 7:15 AM',
    location: 'Camp store loop',
    description: 'Friendly leashed dogs. Coffee after.',
  },
]

const WEATHER_NOTICE = {
  title: 'Severe Weather Notice',
  body: 'Strong storms expected this evening between 7–10 PM. Please secure awnings, lower antennas, and bring in outdoor items. The clubhouse will remain open as a shelter.',
  postedBy: 'Park Office',
  when: '20 min ago',
}

const CAMPER_CARDS = [
  {
    id: 'c1',
    displayName: 'Lisa & Tom',
    style: 'Full-timer · Class A',
    interests: ['☕ Coffee', '🔥 Campfires', '🐕 Dog walks'],
  },
  {
    id: 'c2',
    displayName: 'Mike',
    style: 'Solo traveler · Truck camper',
    interests: ['🥾 Hiking', '🎣 Fishing', '🛶 Kayaking'],
  },
  {
    id: 'c3',
    displayName: 'The Johnson Family',
    style: 'Family · Fifth wheel',
    interests: ['🧒 Kids', '🎲 Board games', '🏊 Pool time'],
  },
  {
    id: 'c4',
    displayName: 'Sarah',
    style: 'Solo · Travel trailer',
    interests: ['🚶 Walking', '🍽️ Local food'],
  },
]

const STATIC_MESSAGE_OPTIONS = [
  'Want to meet for coffee?',
  'Heading to the campfire later?',
  'Want to walk the dogs?',
  'Maybe another time.',
]

const OFFICE_CATEGORIES = [
  { value: 'wifi', label: 'Wi-Fi help' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'noise', label: 'Noise concern' },
  { value: 'late_checkout', label: 'Late checkout' },
  { value: 'local', label: 'Local recommendations' },
  { value: 'general', label: 'General question' },
  { value: 'safety', label: 'Safety concern' },
]

// ---------------------------------------------------------------
// Section components
// ---------------------------------------------------------------

export function DemoCamperHub() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 space-y-5">
      <ScanContextNote />
      <HeaderWithLantern />
      <CriticalNoticeCard />
      <CampgroundInfoCard />
      <ArrivalDepartureCard />
      <WifiCard />
      <ParkMapCard />
      <BulletinsSection />
      <MeetupsSection />
      <OfficeMessagesSection />
      <FeedbackCard />
      <ReviewBookAgainSection />
      <CamperConnectionsSection />
    </div>
  )
}

function ScanContextNote() {
  return (
    <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-3 text-xs text-mist leading-snug">
      <span className="font-semibold text-flame uppercase tracking-wider text-[10px]">
        After QR scan ·{' '}
      </span>
      This is what a camper sees after scanning your campground’s RoadWave
      QR code. Everything below is interactive demo data — nothing is
      saved.
    </div>
  )
}

function HeaderWithLantern() {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-cream leading-tight">
          {CAMPGROUND.name}
        </h1>
        <p className="mt-1 text-xs text-mist">{CAMPGROUND.address}</p>
      </div>
      <Lantern />
    </header>
  )
}

// Self-contained lantern that mirrors the real QR-page Lantern shape
// (button + dropdown panel of notification items). 4 fake
// notifications: bulletin / meetup / office reply / weather.
function Lantern() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (buttonRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  const items = [
    { icon: '⛈️', title: 'Severe Weather Notice', body: 'Strong storms tonight 7–10 PM.', when: '20m' },
    { icon: '📣', title: 'New announcement', body: 'Food truck tonight by the clubhouse.', when: '2h' },
    { icon: '📅', title: 'New meetup', body: 'Coffee at the pavilion · tomorrow 9 AM.', when: '4h' },
    { icon: '📬', title: 'Office reply', body: 'Front desk replied to your Wi-Fi question.', when: '6h' },
  ]

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label="Notifications"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-flame/15 border border-flame/40 text-flame px-2.5 py-1.5 hover:bg-flame/20 transition-colors lantern-pulse"
      >
        <span aria-hidden className="text-base leading-none">
          🏮
        </span>
        <span className="text-[11px] font-semibold tabular-nums">{items.length}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Recent notifications"
          className="fixed right-4 top-16 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-card shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
              Activity
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              Close
            </button>
          </div>
          <ul className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {items.map((n, i) => (
              <li key={i}>
                <div className="w-full text-left px-4 py-3 flex items-start gap-3">
                  <span aria-hidden className="text-base leading-none mt-0.5">{n.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cream leading-tight">{n.title}</p>
                    <p className="text-xs text-mist mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-mist/70 mt-1 tabular-nums">{n.when} ago</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CriticalNoticeCard() {
  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/[0.08] p-4 space-y-2">
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-2xl leading-none mt-0.5">⛈️</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-red-300 font-semibold">
            Weather & Safety
          </p>
          <h2 className="mt-0.5 font-display text-lg font-extrabold text-cream leading-tight">
            {WEATHER_NOTICE.title}
          </h2>
        </div>
      </div>
      <p className="text-sm text-cream leading-relaxed">{WEATHER_NOTICE.body}</p>
      <p className="text-[11px] text-mist">
        Posted by {WEATHER_NOTICE.postedBy} · {WEATHER_NOTICE.when}
      </p>
    </div>
  )
}

function CampgroundInfoCard() {
  return (
    <Card>
      <Eyebrow>Campground Office</Eyebrow>
      <h2 className="mt-1 font-display text-lg font-extrabold text-cream leading-tight">
        {CAMPGROUND.name}
      </h2>
      <p className="mt-1 text-sm text-mist">{CAMPGROUND.address}</p>
      <a
        href={`tel:${CAMPGROUND.phone.replace(/[^0-9]/g, '')}`}
        className="mt-3 inline-flex items-center gap-2 text-sm text-flame font-semibold underline-offset-2 hover:underline"
      >
        📞 Call office: {CAMPGROUND.phone}
      </a>
    </Card>
  )
}

function ArrivalDepartureCard() {
  return (
    <Card>
      <Eyebrow>Arrival & Departure</Eyebrow>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-mist uppercase tracking-wider">Check in</p>
          <p className="font-semibold text-cream mt-0.5">{CAMPGROUND.checkInTime}</p>
        </div>
        <div>
          <p className="text-xs text-mist uppercase tracking-wider">Check out</p>
          <p className="font-semibold text-cream mt-0.5">{CAMPGROUND.checkOutTime}</p>
        </div>
      </div>
    </Card>
  )
}

function WifiCard() {
  return (
    <Card>
      <Eyebrow>Wi-Fi</Eyebrow>
      <p className="mt-1 text-xs text-mist">
        Tap the value or use the copy button.
      </p>
      <div className="mt-3 space-y-3">
        <CopyableField
          label="Network"
          value={CAMPGROUND.wifi.network}
        />
        <CopyableField
          label="Password"
          value={CAMPGROUND.wifi.password}
        />
      </div>
      <p className="mt-3 text-xs text-mist leading-snug">
        {CAMPGROUND.wifi.notes}
      </p>
    </Card>
  )
}

// Boxed Wi-Fi credential field with its own copy button + tap-to-
// select fallback. Mirrors the production WifiCopyButton pattern
// (src/components/campgrounds/wifi-copy-button.tsx): async
// navigator.clipboard call wrapped in try/catch, 2-second
// confirmation, explicit error state if the API is unavailable
// (Safari iOS in some contexts, http-only origins, blocked by
// permissions policy).
function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valueRef = useRef<HTMLSpanElement | null>(null)

  async function handleCopy() {
    setError(null)
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable / denied. The value is already
      // select-all'd via onClick below, so the camper can long-
      // press the text to copy manually.
      setError('Copy unavailable — tap the value to select.')
    }
  }

  // Tap the value text -> select it so a manual long-press copy
  // works on browsers without the clipboard API. The Selection
  // API is supported everywhere browsers have any text rendering.
  function handleSelect() {
    const node = valueRef.current
    if (!node) return
    const range = document.createRange()
    range.selectNodeContents(node)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-mist font-semibold">
        {label}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSelect}
          className="text-left min-w-0 flex-1 cursor-text"
          aria-label={`${label}: ${value}. Tap to select.`}
        >
          <span
            ref={valueRef}
            className="block font-mono text-base text-cream font-semibold tracking-wide break-all select-all"
          >
            {value}
          </span>
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className={
            copied
              ? 'shrink-0 inline-flex items-center gap-1.5 rounded-md border border-leaf/40 bg-leaf/15 text-leaf px-3 py-1.5 text-xs font-semibold transition-colors'
              : 'shrink-0 inline-flex items-center gap-1.5 rounded-md border border-flame/40 bg-flame/10 text-flame px-3 py-1.5 text-xs font-semibold hover:bg-flame/15 transition-colors'
          }
        >
          <span aria-hidden>{copied ? '✓' : '⧉'}</span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

function ParkMapCard() {
  return (
    <Card>
      <Eyebrow>Park Map</Eyebrow>
      <div className="mt-3 aspect-[16/10] rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center">
        <p className="text-xs text-mist">🗺️ Park map preview</p>
      </div>
      <p className="mt-3 text-xs text-mist leading-snug">
        Site map, bathhouse + pool locations, evacuation routes.
      </p>
    </Card>
  )
}

function BulletinsSection() {
  return (
    <Card>
      <Eyebrow>Campground Bulletins</Eyebrow>
      <ul className="mt-3 space-y-2">
        {BULLETINS.map((b) => (
          <li
            key={b.id}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm text-cream leading-relaxed"
          >
            <p>{b.message}</p>
            <p className="mt-1 text-[10px] text-mist tabular-nums">{b.when}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function MeetupsSection() {
  return (
    <Card>
      <Eyebrow>Happening at the Campground</Eyebrow>
      <p className="mt-1 text-xs text-mist">Posted by the campground.</p>
      <ul className="mt-3 space-y-2.5">
        {MEETUPS.map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
          >
            <p className="text-sm font-semibold text-cream leading-tight">{m.title}</p>
            <p className="mt-0.5 text-xs text-flame tabular-nums">{m.when}</p>
            <p className="mt-0.5 text-xs text-mist">{m.location}</p>
            <p className="mt-1.5 text-sm text-cream/90 leading-snug">{m.description}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function OfficeMessagesSection() {
  type ThreadEntry = { sender: 'guest' | 'office'; body: string; when: string }
  const [submitted, setSubmitted] = useState(false)
  const [thread, setThread] = useState<ThreadEntry[]>([])
  const [category, setCategory] = useState('wifi')
  const [body, setBody] = useState('')
  const [typing, setTyping] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitted(true)
    setThread((prev) => [
      ...prev,
      { sender: 'guest', body: body.trim(), when: 'just now' },
    ])
    setBody('')
    setTyping(true)
    window.setTimeout(() => {
      setThread((prev) => [
        ...prev,
        {
          sender: 'office',
          body: "Thanks for the message! We'll have an answer for you shortly. — Front Desk",
          when: 'just now',
        },
      ])
      setTyping(false)
    }, 1500)
  }

  return (
    <Card>
      <Eyebrow>Office Help & Messages</Eyebrow>
      <p className="mt-1 text-xs text-mist leading-snug">
        Need to send a direct message to the office?
      </p>

      {!submitted && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="block text-xs text-mist mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 text-cream text-sm px-3 py-2"
            >
              {OFFICE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-mist mb-1">Your message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Site 12 here. Wi-Fi keeps dropping every few minutes."
              className="w-full rounded-lg border border-white/10 bg-white/5 text-cream text-sm px-3 py-2 placeholder:text-mist/60"
            />
          </div>
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            Send to office
          </button>
        </form>
      )}

      {submitted && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-leaf">✓ Message sent. The office will reply here.</p>
          <ul className="space-y-2">
            {thread.map((t, i) => (
              <li
                key={i}
                className={
                  t.sender === 'guest'
                    ? 'rounded-lg bg-flame/10 border border-flame/30 px-3 py-2 ml-auto max-w-[85%]'
                    : 'rounded-lg bg-white/5 border border-white/10 px-3 py-2 mr-auto max-w-[85%]'
                }
              >
                <p className="text-[10px] uppercase tracking-wider text-mist">
                  {t.sender === 'guest' ? 'You' : 'Park Office'}
                </p>
                <p className="text-sm text-cream mt-0.5 leading-relaxed">{t.body}</p>
                <p className="text-[10px] text-mist/70 mt-1">{t.when}</p>
              </li>
            ))}
            {typing && (
              <li className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 mr-auto max-w-[85%]">
                <p className="text-[10px] uppercase tracking-wider text-mist">Park Office</p>
                <p className="text-sm text-mist mt-0.5 italic">typing…</p>
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setThread([])
            }}
            className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            Reset demo message thread
          </button>
        </div>
      )}
    </Card>
  )
}

function FeedbackCard() {
  const [picked, setPicked] = useState<'great' | 'good' | 'attention' | null>(null)
  return (
    <Card>
      <Eyebrow>Mid-stay check-in</Eyebrow>
      <h3 className="mt-1 font-display text-base font-extrabold text-cream">
        How’s your stay so far?
      </h3>
      {!picked ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <FeedbackButton onClick={() => setPicked('great')}>😄 Great</FeedbackButton>
          <FeedbackButton onClick={() => setPicked('good')}>🙂 Good</FeedbackButton>
          <FeedbackButton onClick={() => setPicked('attention')}>
            🛠️ Something needs attention
          </FeedbackButton>
        </div>
      ) : (
        <p className="mt-3 text-sm text-leaf">
          ✓ Thanks for letting the office know.{' '}
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            (reset)
          </button>
        </p>
      )}
    </Card>
  )
}

function FeedbackButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-cream hover:border-flame/40 hover:bg-flame/[0.08] transition-colors"
    >
      {children}
    </button>
  )
}

function ReviewBookAgainSection() {
  return (
    <Card>
      <Eyebrow>Loving it here?</Eyebrow>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => alert('Demo Mode: in production this opens your Google review link.')}
          className="rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          ⭐ Leave a Review
        </button>
        <button
          type="button"
          onClick={() => alert('Demo Mode: in production this opens your rebooking link.')}
          className="rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2.5 text-sm font-semibold hover:bg-flame/15 transition-colors"
        >
          📅 Book Again
        </button>
      </div>
    </Card>
  )
}

function CamperConnectionsSection() {
  return (
    <Card>
      <Eyebrow>Optional · Camper Connections</Eyebrow>
      <h3 className="mt-1 font-display text-lg font-extrabold text-cream">
        Want to meet other campers here?
      </h3>
      <p className="mt-2 text-sm text-mist leading-relaxed">
        Find your campground people without making it weird.
      </p>
      <p className="mt-2 text-xs text-mist/80 leading-snug">
        Campground info is available without an account. Camper Connections
        are optional. You choose your visibility. No exact site numbers, no
        always-on GPS, no public chat.
      </p>
      <ul className="mt-4 space-y-2.5">
        {CAMPER_CARDS.map((c) => (
          <CamperCard key={c.id} camper={c} />
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-mist/70 leading-snug">
        Owners don’t read private camper-to-camper messages. Mutual Waves are
        between campers only.
      </p>
    </Card>
  )
}

// One camper card with full Wave + match + message flow.
function CamperCard({ camper }: { camper: (typeof CAMPER_CARDS)[number] }) {
  type Stage = 'idle' | 'waved' | 'matched' | 'messaged'
  const [stage, setStage] = useState<Stage>('idle')
  const [pickedMessage, setPickedMessage] = useState<string | null>(null)

  function handleWave() {
    setStage('waved')
    // Simulate the other camper waving back ~1.5s later.
    window.setTimeout(() => setStage('matched'), 1500)
  }

  function handlePick(msg: string) {
    setPickedMessage(msg)
    setStage('messaged')
  }

  return (
    <li className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-cream leading-tight">{camper.displayName}</p>
          <p className="text-[11px] text-mist mt-0.5">{camper.style}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {camper.interests.map((i) => (
              <li
                key={i}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cream"
              >
                {i}
              </li>
            ))}
          </ul>
        </div>
        {stage === 'idle' && (
          <button
            type="button"
            onClick={handleWave}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold hover:bg-amber-400 transition-colors"
          >
            👋 Send Wave
          </button>
        )}
        {stage === 'waved' && (
          <span className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] italic text-mist">
            Wave sent · waiting
          </span>
        )}
        {(stage === 'matched' || stage === 'messaged') && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-flame/15 border border-flame/30 px-2 py-1 text-[10px] font-semibold text-flame">
            Matched 🎉
          </span>
        )}
      </div>

      {stage === 'matched' && (
        <div className="rounded-lg bg-flame/[0.06] border border-flame/20 p-3 space-y-2">
          <p className="text-xs text-mist">
            You both waved. Send a quick hello (you can write your own once
            you connect):
          </p>
          <div className="flex flex-wrap gap-2">
            {STATIC_MESSAGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handlePick(opt)}
                className="inline-flex rounded-full border border-flame/40 bg-flame/10 text-flame px-3 py-1 text-xs font-semibold hover:bg-flame/20 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'messaged' && (
        <div className="rounded-lg border border-leaf/30 bg-leaf/[0.06] p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-leaf font-semibold">
            Sent to {camper.displayName.split(/[ &]/)[0]}
          </p>
          <p className="text-sm text-cream">{pickedMessage}</p>
          <p className="text-[11px] text-mist mt-1.5">
            Saved to your <strong className="text-cream">Past Waves</strong>.
            You can keep messaging even after you leave this campground.
          </p>
        </div>
      )}
    </li>
  )
}

// ---------------------------------------------------------------
// Tiny shared primitives
// ---------------------------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20">
      {children}
    </section>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
      {children}
    </p>
  )
}

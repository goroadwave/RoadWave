'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

// Phase 3 of the RoadWave Demo Center -- standalone owner
// dashboard demo at /demo-center/owner. Mirrors the visual
// structure of the real /owner/dashboard + the surrounding owner
// pages so a prospect sees the actual product.
//
// All sections render from mock data defined at the top of the
// file. Interactive bits use local React state:
//   * Bulletin composer + list (post a bulletin, see it appear)
//   * Meetup composer + list (with end-before-start validation
//     that preserves form values per the production behavior
//     fixed in 2026-05-23)
//   * Weather & Safety notice composer (red critical pill)
//   * Office Messages inbox with tab filter (Active / New /
//     Resolved / Archived / All), expand-to-thread, owner reply
//     (canned 1s typing fake), mark Read / Resolved / Archived,
//     un-archive, reset demo
//   * Review / Book Again link settings (toggles)
//
// No DB, no API, no auth, no Stripe, no real emails. The whole
// component is safe to load behind /demo-center/* (which is
// public by design via the layout in src/app/demo-center/).

// ---------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------

const CAMPGROUND = {
  name: 'Pine Ridge RV Resort',
  slug: 'pine-ridge',
  ownerName: 'Mark',
}

const TODAY_STATS = [
  { label: 'Active check-ins', value: 47, hint: 'right now' },
  { label: 'QR scans today', value: 128, hint: 'guest QR page visits' },
  { label: 'New office messages', value: 3, hint: 'awaiting reply' },
  { label: 'Bulletins this week', value: 4, hint: 'posted' },
  { label: 'Meetups this week', value: 7, hint: 'on the calendar' },
  { label: 'Review link clicks', value: 22, hint: 'past 7 days' },
  { label: 'Rebook clicks', value: 9, hint: 'past 7 days' },
  { label: 'Camper waves', value: 31, hint: 'past 7 days' },
]

const SEED_BULLETINS = [
  {
    id: 'b-seed-1',
    message:
      'Pool hours updated this weekend: 8 AM – 10 PM Fri/Sat. Lifeguard on duty 11 AM – 7 PM.',
    postedAt: 'yesterday',
  },
  {
    id: 'b-seed-2',
    message:
      'Reminder: quiet hours start at 10 PM. Generators off, music down, fires low.',
    postedAt: '3 days ago',
  },
]

const SEED_MEETUPS = [
  {
    id: 'm-seed-1',
    title: 'Coffee at the pavilion',
    location: 'Pavilion by the pool',
    when: 'Tomorrow · 9:00 AM',
    description: 'Casual coffee. Come say hello.',
  },
  {
    id: 'm-seed-2',
    title: 'Sunset walk',
    location: 'Lakeshore trail',
    when: 'Tonight · 7:30 PM',
    description: 'Easy 1.5 mile loop. Dogs welcome.',
  },
]

type MessageStatus = 'new' | 'read' | 'resolved' | 'archived'

type DemoMessage = {
  id: string
  guestName: string
  site: string
  category: string
  body: string
  submittedAt: string
  status: MessageStatus
  preferredContact: 'phone' | 'text' | 'email' | 'no_reply'
  phone: string
  email: string
  safety?: boolean
  thread: Array<{ sender: 'guest' | 'owner'; body: string; when: string }>
}

const SEED_MESSAGES: DemoMessage[] = [
  {
    id: 'msg-1',
    guestName: 'Site 24 · Lisa Tan',
    site: '24',
    category: 'Wi-Fi help',
    body: "Our Wi-Fi password isn't working. We tried it twice on two devices.",
    submittedAt: '12 min ago',
    status: 'new',
    preferredContact: 'text',
    phone: '(555) 213-7788',
    email: 'lisa.t@example.com',
    thread: [],
  },
  {
    id: 'msg-2',
    guestName: 'Site 12 · Tom Reyes',
    site: '12',
    category: 'Late checkout',
    body: 'Can we request late checkout tomorrow? We can be packed by 1 PM.',
    submittedAt: '40 min ago',
    status: 'new',
    preferredContact: 'phone',
    phone: '(555) 884-2110',
    email: 'tom.reyes@example.com',
    thread: [],
  },
  {
    id: 'msg-3',
    guestName: 'Site 8 · Andre Wu',
    site: '8',
    category: 'Maintenance',
    body: 'There is a leaking spigot near the bathhouse on the south side.',
    submittedAt: '2 hours ago',
    status: 'read',
    preferredContact: 'text',
    phone: '(555) 442-9120',
    email: 'andre.w@example.com',
    thread: [
      {
        sender: 'owner',
        body:
          "Thanks for flagging this Andre -- I'll send maintenance over within the hour.",
        when: '1 hour ago',
      },
    ],
  },
  {
    id: 'msg-4',
    guestName: 'Site 3 · Marisol Vega',
    site: '3',
    category: 'Safety concern',
    body:
      'A guest near site 5 is letting their dog off-leash near the playground. Wanted to flag it.',
    submittedAt: 'yesterday',
    status: 'resolved',
    preferredContact: 'no_reply',
    phone: '(555) 770-3322',
    email: 'marisol@example.com',
    safety: true,
    thread: [
      {
        sender: 'owner',
        body:
          'Thanks Marisol -- we spoke with them. Appreciate the heads up.',
        when: 'yesterday',
      },
    ],
  },
  {
    id: 'msg-5',
    guestName: 'Site 19 · Hank Olsen',
    site: '19',
    category: 'Compliment',
    body: 'The pavilion is beautiful. Tell whoever planted those flowers thank you.',
    submittedAt: '4 days ago',
    status: 'archived',
    preferredContact: 'email',
    phone: '(555) 612-4567',
    email: 'hank.o@example.com',
    thread: [
      {
        sender: 'owner',
        body: "Thanks Hank! I'll let Beth know -- she'll love hearing that.",
        when: '4 days ago',
      },
    ],
  },
]

const SETUP_CHECKLIST = [
  { label: 'Campground name + logo', done: true },
  { label: 'Address, phone, office hours', done: true },
  { label: 'Wi-Fi network + password', done: true },
  { label: 'Park map upload', done: true },
  { label: 'Amenities checklist', done: true },
  { label: 'Quiet hours + rules', done: true },
  { label: 'Check-in / check-out times', done: true },
  { label: 'Google review link', done: true },
  { label: 'Book Again link + promo', done: true },
  { label: 'Print + post your QR cards', done: false },
]

const CC_STATS = [
  { label: 'Visible campers right now', value: 18, hint: 'opted in to Camper Connections' },
  { label: 'Waves sent', value: 31, hint: 'past 7 days' },
  { label: 'Mutual matches', value: 12, hint: 'past 7 days' },
  { label: 'Past Waves created', value: 47, hint: 'all-time at this campground' },
]

// ---------------------------------------------------------------
// Root component
// ---------------------------------------------------------------

export function DemoOwnerHub() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10 space-y-6">
      <Header />
      <SectionNav />
      <StatsGrid />
      <SetupChecklist />
      <QrPreviewCard />
      <BulletinComposerSection />
      <MeetupComposerSection />
      <WeatherNoticeComposerSection />
      <MessagesInboxSection />
      <ReviewBookAgainSection />
      <CamperConnectionsSummarySection />
    </div>
  )
}

function Header() {
  return (
    <header>
      <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Owner Dashboard
      </p>
      <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-cream leading-tight">
        Hey {CAMPGROUND.ownerName} 👋
      </h1>
      <p className="mt-1 text-sm text-mist">
        {CAMPGROUND.name} · <span className="text-cream/80 font-mono">/{CAMPGROUND.slug}</span>
      </p>
    </header>
  )
}

function SectionNav() {
  const sections = [
    { id: 'stats', label: 'Stats' },
    { id: 'setup', label: 'Setup' },
    { id: 'qr', label: 'QR Page' },
    { id: 'bulletins', label: 'Bulletins' },
    { id: 'meetups', label: 'Meetups' },
    { id: 'weather', label: 'Weather' },
    { id: 'messages', label: 'Messages' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'connections', label: 'Connections' },
  ]
  return (
    <nav className="rounded-2xl border border-white/5 bg-card/50 px-3 py-2">
      <ul className="flex flex-wrap gap-1.5 text-xs">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-flex items-center rounded-md px-2 py-1 text-mist hover:text-cream hover:bg-white/5 transition-colors"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function StatsGrid() {
  return (
    <section id="stats">
      <Eyebrow>This week at a glance</Eyebrow>
      <div className="mt-3 grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
        {TODAY_STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/5 bg-card p-3"
          >
            <p className="text-[10px] uppercase tracking-wider text-mist leading-snug">
              {s.label}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-cream tabular-nums leading-none">
              {s.value}
            </p>
            <p className="mt-1 text-[10px] text-mist/70 leading-snug">{s.hint}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SetupChecklist() {
  return (
    <Card id="setup">
      <Eyebrow>Setup checklist</Eyebrow>
      <p className="mt-1 text-xs text-mist">
        What you configure once when you sign up. Edit any of these from
        Profile / QR / Marketing later.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {SETUP_CHECKLIST.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-2 text-sm leading-snug"
          >
            <span
              aria-hidden
              className={
                item.done
                  ? 'mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-leaf/20 border border-leaf/40 text-leaf text-[10px] shrink-0'
                  : 'mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-mist/40 text-mist/60 text-[10px] shrink-0'
              }
            >
              {item.done ? '✓' : '○'}
            </span>
            <span className={item.done ? 'text-cream' : 'text-mist'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function QrPreviewCard() {
  return (
    <Card id="qr">
      <Eyebrow>Your QR guest page</Eyebrow>
      <p className="mt-1 text-xs text-mist">
        This is the page guests land on after scanning the printable QR card
        you put in the office, bathhouse, or check-in folder.
      </p>
      <div className="mt-3 flex flex-col sm:flex-row items-start gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col items-center w-40 shrink-0">
          <div className="h-32 w-32 rounded-md bg-cream/95 flex items-center justify-center">
            <span aria-hidden className="text-6xl">⏹️</span>
          </div>
          <p className="mt-3 text-[11px] text-mist font-mono break-all text-center">
            getroadwave.com/p/{CAMPGROUND.slug}
          </p>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-sm text-cream leading-relaxed">
            The QR card prints with your campground name, the RoadWave logo,
            and a friendly &ldquo;Scan for Wi-Fi, maps, bulletins, and meetups&rdquo;
            tagline.
          </p>
          <Link
            href="/demo-center/camper"
            className="inline-flex items-center gap-1.5 rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            Preview the camper experience →
          </Link>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------
// Bulletin composer
// ---------------------------------------------------------------

function BulletinComposerSection() {
  const [bulletins, setBulletins] = useState(SEED_BULLETINS)
  const [body, setBody] = useState('')
  const [posted, setPosted] = useState(false)

  function handlePost(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBulletins((prev) => [
      { id: `b-${Date.now()}`, message: body.trim(), postedAt: 'just now' },
      ...prev,
    ])
    setBody('')
    setPosted(true)
    window.setTimeout(() => setPosted(false), 2000)
  }

  return (
    <Card id="bulletins">
      <Eyebrow>Bulletins</Eyebrow>
      <p className="mt-1 text-xs text-mist">
        Short campground-wide announcements. Campers see them on the QR page
        and in the Lantern.
      </p>

      <form onSubmit={handlePost} className="mt-3 space-y-2">
        <label className="block text-xs text-mist">Your bulletin</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="Taco truck by the clubhouse from 5–8 PM."
          className="w-full rounded-lg border border-white/10 bg-white/5 text-cream text-sm px-3 py-2 placeholder:text-mist/60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-mist tabular-nums">
            {body.length}/280
          </span>
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            Post bulletin
          </button>
        </div>
        {posted && (
          <p className="text-xs text-leaf">
            ✓ Posted. Campers will see it on the next refresh in this demo.
          </p>
        )}
      </form>

      <ul className="mt-4 space-y-2">
        {bulletins.map((b) => (
          <li
            key={b.id}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
          >
            <p className="text-sm text-cream leading-relaxed">{b.message}</p>
            <p className="mt-1 text-[10px] text-mist tabular-nums">
              {b.postedAt}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ---------------------------------------------------------------
// Meetup composer (with end-before-start validation that
// preserves form values -- matches the production behavior shipped
// in commit cc3970a, 2026-05-23).
// ---------------------------------------------------------------

function MeetupComposerSection() {
  const [meetups, setMeetups] = useState(SEED_MEETUPS)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<string | null>(null)
  const [posted, setPosted] = useState(false)

  function reset() {
    setTitle('')
    setLocation('')
    setStartAt('')
    setEndAt('')
    setDescription('')
    setError(null)
    setErrorField(null)
  }

  function handlePost(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setErrorField(null)
    if (!title.trim()) {
      setError('Title is required')
      setErrorField('title')
      return
    }
    if (!startAt) {
      setError('Pick a start time')
      setErrorField('start_at')
      return
    }
    // The production behavior: if end_at < start_at, show an error
    // AND preserve every field. The demo does the same to show the
    // prospect exactly what they'd experience.
    if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      setError('End time must be after start time')
      setErrorField('end_at')
      return
    }
    const when = formatMeetupWhen(startAt, endAt)
    setMeetups((prev) => [
      {
        id: `m-${Date.now()}`,
        title: title.trim(),
        location: location.trim() || 'Campground',
        when,
        description: description.trim() || 'No description provided.',
      },
      ...prev,
    ])
    reset()
    setPosted(true)
    window.setTimeout(() => setPosted(false), 2000)
  }

  function fieldClass(name: string) {
    const base =
      'w-full rounded-lg border bg-white/5 text-cream text-sm px-3 py-2 placeholder:text-mist/60'
    return errorField === name
      ? `${base} border-red-500/60 focus:border-red-400`
      : `${base} border-white/10`
  }

  return (
    <Card id="meetups">
      <Eyebrow>Meetups</Eyebrow>
      <p className="mt-1 text-xs text-mist">
        Campground-hosted gatherings. Coffee, sunset walks, fire-ring chats.
        Campers see them in the Happening section.
      </p>

      <form onSubmit={handlePost} className="mt-3 space-y-3" noValidate>
        <div>
          <label className="block text-xs text-mist mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Sunset campfire"
            className={fieldClass('title')}
          />
        </div>
        <div>
          <label className="block text-xs text-mist mb-1">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            placeholder="Pavilion, fire ring 3, etc."
            className={fieldClass('location')}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-mist mb-1">Starts</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={fieldClass('start_at')}
            />
          </div>
          <div>
            <label className="block text-xs text-mist mb-1">
              Ends <span className="text-mist/60">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={fieldClass('end_at')}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-mist mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Bring a chair. We'll have hot cocoa."
            className={`${fieldClass('description')} resize-y`}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300"
          >
            {error}
          </p>
        )}
        {posted && (
          <p className="text-xs text-leaf">
            ✓ Meetup posted. Form cleared for the next one.
          </p>
        )}

        <button
          type="submit"
          className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          Post meetup
        </button>
      </form>

      <ul className="mt-4 space-y-2.5">
        {meetups.map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
          >
            <p className="text-sm font-semibold text-cream leading-tight">
              {m.title}
            </p>
            <p className="mt-0.5 text-xs text-flame tabular-nums">{m.when}</p>
            <p className="mt-0.5 text-xs text-mist">{m.location}</p>
            <p className="mt-1.5 text-sm text-cream/90 leading-snug">
              {m.description}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function formatMeetupWhen(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso)
    const startStr = start.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    if (!endIso) return startStr
    const end = new Date(endIso)
    const endStr = end.toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${startStr} – ${endStr}`
  } catch {
    return startIso
  }
}

// ---------------------------------------------------------------
// Weather & Safety notice composer
// ---------------------------------------------------------------

function WeatherNoticeComposerSection() {
  const [notices, setNotices] = useState<
    Array<{ id: string; title: string; body: string; when: string }>
  >([])
  const [title, setTitle] = useState('Severe Weather Notice')
  const [body, setBody] = useState('')
  const [posted, setPosted] = useState(false)

  function handlePost(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setNotices((prev) => [
      {
        id: `w-${Date.now()}`,
        title: title.trim() || 'Weather & Safety Notice',
        body: body.trim(),
        when: 'just now',
      },
      ...prev,
    ])
    setBody('')
    setPosted(true)
    window.setTimeout(() => setPosted(false), 2000)
  }

  return (
    <Card id="weather">
      <Eyebrow>Weather & Safety Alerts</Eyebrow>
      <p className="mt-1 text-xs text-mist leading-snug">
        Use this for actual weather or campground safety info. It renders as
        a red critical card at the top of the camper QR page and fires a
        dedicated notification. Not a 911 / emergency dispatch system —
        for owner-posted weather + safety only.
      </p>

      <form onSubmit={handlePost} className="mt-3 space-y-3">
        <div>
          <label className="block text-xs text-mist mb-1">Notice title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className="w-full rounded-lg border border-white/10 bg-white/5 text-cream text-sm px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-mist mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Strong storms expected this evening between 7–10 PM. Please secure awnings and outdoor items."
            className="w-full rounded-lg border border-white/10 bg-white/5 text-cream text-sm px-3 py-2 placeholder:text-mist/60"
          />
        </div>
        {posted && (
          <p className="text-xs text-leaf">
            ✓ Notice posted. It surfaces as a red card at the top of every
            camper&apos;s screen.
          </p>
        )}
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-lg bg-red-500 text-night px-4 py-2 text-sm font-semibold hover:bg-red-400 disabled:opacity-50 transition-colors"
        >
          Post Weather & Safety notice
        </button>
      </form>

      <ul className="mt-4 space-y-2">
        {notices.map((n) => (
          <li
            key={n.id}
            className="rounded-lg border border-red-500/40 bg-red-500/[0.08] p-3"
          >
            <p className="text-[10px] uppercase tracking-wider text-red-300 font-semibold">
              ⛈️ Weather & Safety · {n.when}
            </p>
            <p className="mt-1 font-display text-base font-extrabold text-cream leading-tight">
              {n.title}
            </p>
            <p className="mt-1 text-sm text-cream leading-relaxed">{n.body}</p>
          </li>
        ))}
        {notices.length === 0 && (
          <li className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-xs text-mist text-center">
            No active notices. Post one above to see how it lands.
          </li>
        )}
      </ul>
    </Card>
  )
}

// ---------------------------------------------------------------
// Office Messages inbox
// ---------------------------------------------------------------

type InboxFilter = 'active' | 'new' | 'resolved' | 'archived' | 'all'

function MessagesInboxSection() {
  const [messages, setMessages] = useState(SEED_MESSAGES)
  const [filter, setFilter] = useState<InboxFilter>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState<Record<string, string>>({})
  const [typingId, setTypingId] = useState<string | null>(null)

  // Auto-mark every 'new' message as 'read' on first mount -- mirrors
  // the production behavior fixed in mig 0063 + commit 422b440 so
  // opening the inbox stops the glow.
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.status === 'new' ? { ...m, status: 'read' } : m)),
    )
  }, [])

  const counts = {
    active: messages.filter((m) => m.status === 'new' || m.status === 'read').length,
    new: messages.filter((m) => m.status === 'new').length,
    resolved: messages.filter((m) => m.status === 'resolved').length,
    archived: messages.filter((m) => m.status === 'archived').length,
    all: messages.length,
  }

  const visible = messages.filter((m) => {
    if (filter === 'all') return true
    if (filter === 'active') return m.status === 'new' || m.status === 'read'
    return m.status === filter
  })

  function setStatus(id: string, next: MessageStatus) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)))
  }

  function sendReply(id: string) {
    const text = (replyBody[id] ?? '').trim()
    if (!text) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status: m.status === 'new' ? 'read' : m.status,
              thread: [...m.thread, { sender: 'owner', body: text, when: 'just now' }],
            }
          : m,
      ),
    )
    setReplyBody((r) => ({ ...r, [id]: '' }))

    // Fake guest follow-up after ~1.2s for the demo punch.
    setTypingId(id)
    window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                thread: [
                  ...m.thread,
                  {
                    sender: 'guest',
                    body: 'Thanks! Appreciate the quick reply.',
                    when: 'just now',
                  },
                ],
              }
            : m,
        ),
      )
      setTypingId(null)
    }, 1200)
  }

  function resetDemo() {
    setMessages(SEED_MESSAGES.map((m) => ({ ...m, thread: [...m.thread] })))
    setExpandedId(null)
    setReplyBody({})
    setFilter('active')
  }

  return (
    <Card id="messages">
      <Eyebrow>Office Messages</Eyebrow>
      <p className="mt-1 text-xs text-mist">
        Guest contact form submissions. Reply, mark resolved, or archive.
        Resolved / archived stay searchable under their tabs — nothing is
        hard-deleted.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <FilterTab active={filter === 'active'} count={counts.active} onClick={() => setFilter('active')}>
          Active
        </FilterTab>
        <FilterTab active={filter === 'new'} count={counts.new} onClick={() => setFilter('new')}>
          New
        </FilterTab>
        <FilterTab active={filter === 'resolved'} count={counts.resolved} onClick={() => setFilter('resolved')}>
          Resolved
        </FilterTab>
        <FilterTab active={filter === 'archived'} count={counts.archived} onClick={() => setFilter('archived')}>
          Archived
        </FilterTab>
        <FilterTab active={filter === 'all'} count={counts.all} onClick={() => setFilter('all')}>
          All
        </FilterTab>
        <button
          type="button"
          onClick={resetDemo}
          className="ml-auto text-[11px] text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          Reset demo
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {visible.length === 0 && (
          <li className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs text-mist">
            No messages in this tab.
          </li>
        )}
        {visible.map((m) => {
          const expanded = expandedId === m.id
          return (
            <li
              key={m.id}
              className={`rounded-lg border bg-white/[0.02] p-3 ${
                m.safety
                  ? 'border-red-500/40'
                  : m.status === 'new'
                    ? 'border-flame/40'
                    : 'border-white/5'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : m.id)}
                className="w-full text-left flex items-start justify-between gap-3"
                aria-expanded={expanded}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-mist">
                      {m.category}
                    </span>
                    {m.safety && (
                      <span className="text-[10px] uppercase tracking-wider rounded-full border border-red-500/40 bg-red-500/15 text-red-300 px-1.5 py-0.5 font-semibold">
                        Safety
                      </span>
                    )}
                    <StatusPill status={m.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-cream leading-tight">
                    {m.guestName}
                  </p>
                  <p className="mt-1 text-sm text-cream/90 leading-snug line-clamp-2">
                    {m.body}
                  </p>
                  <p className="mt-1 text-[10px] text-mist tabular-nums">
                    {m.submittedAt}
                  </p>
                </div>
                <span aria-hidden className="text-mist shrink-0 mt-1">
                  {expanded ? '▾' : '▸'}
                </span>
              </button>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-mist">Preferred</p>
                      <p className="text-cream capitalize">
                        {m.preferredContact.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-mist">Phone</p>
                      <p className="text-cream font-mono">{m.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-mist">Email</p>
                      <p className="text-cream font-mono break-all">
                        {m.email}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-mist font-semibold">
                      Conversation
                    </p>
                    <ul className="mt-2 space-y-2">
                      <li className="rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-mist">
                          {m.guestName.split(' · ')[1] ?? 'Guest'}
                        </p>
                        <p className="text-sm text-cream mt-0.5 leading-relaxed">
                          {m.body}
                        </p>
                        <p className="text-[10px] text-mist/70 mt-1">
                          {m.submittedAt}
                        </p>
                      </li>
                      {m.thread.map((t, i) => (
                        <li
                          key={i}
                          className={
                            t.sender === 'owner'
                              ? 'rounded-lg bg-flame/10 border border-flame/30 px-3 py-2 ml-auto max-w-[90%]'
                              : 'rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2 mr-auto max-w-[90%]'
                          }
                        >
                          <p className="text-[10px] uppercase tracking-wider text-mist">
                            {t.sender === 'owner' ? 'You · Park Office' : 'Guest'}
                          </p>
                          <p className="text-sm text-cream mt-0.5 leading-relaxed">
                            {t.body}
                          </p>
                          <p className="text-[10px] text-mist/70 mt-1">{t.when}</p>
                        </li>
                      ))}
                      {typingId === m.id && (
                        <li className="rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2 mr-auto max-w-[90%]">
                          <p className="text-[10px] uppercase tracking-wider text-mist">
                            Guest
                          </p>
                          <p className="text-sm text-mist mt-0.5 italic">typing…</p>
                        </li>
                      )}
                    </ul>
                  </div>

                  {m.status !== 'archived' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase tracking-wider text-mist font-semibold">
                        Your reply
                      </label>
                      <textarea
                        value={replyBody[m.id] ?? ''}
                        onChange={(e) =>
                          setReplyBody((r) => ({ ...r, [m.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Hi — happy to help…"
                        className="w-full rounded-lg border border-white/10 bg-white/5 text-cream text-sm px-3 py-2 placeholder:text-mist/60"
                      />
                      <button
                        type="button"
                        onClick={() => sendReply(m.id)}
                        disabled={!(replyBody[m.id] ?? '').trim()}
                        className="rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                      >
                        Send reply
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {m.status !== 'resolved' && m.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => setStatus(m.id, 'resolved')}
                        className="rounded-md border border-leaf/40 bg-leaf/10 text-leaf px-3 py-1 text-[11px] font-semibold hover:bg-leaf/15 transition-colors"
                      >
                        ✓ Mark resolved
                      </button>
                    )}
                    {m.status === 'resolved' && (
                      <button
                        type="button"
                        onClick={() => setStatus(m.id, 'read')}
                        className="rounded-md border border-white/10 bg-white/5 text-mist px-3 py-1 text-[11px] font-semibold hover:text-cream hover:border-white/20 transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                    {m.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => setStatus(m.id, 'archived')}
                        className="rounded-md border border-white/10 bg-white/5 text-mist px-3 py-1 text-[11px] font-semibold hover:text-cream hover:border-white/20 transition-colors"
                      >
                        Archive
                      </button>
                    )}
                    {m.status === 'archived' && (
                      <button
                        type="button"
                        onClick={() => setStatus(m.id, 'resolved')}
                        className="rounded-md border border-white/10 bg-white/5 text-mist px-3 py-1 text-[11px] font-semibold hover:text-cream hover:border-white/20 transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function FilterTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-md bg-flame/15 border border-flame/40 text-flame px-2.5 py-1 font-semibold'
          : 'inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 text-mist hover:text-cream hover:border-white/20 px-2.5 py-1'
      }
    >
      {children}
      <span className="text-[10px] tabular-nums opacity-70">({count})</span>
    </button>
  )
}

function StatusPill({ status }: { status: MessageStatus }) {
  if (status === 'new') {
    return (
      <span className="inline-flex items-center rounded-full bg-flame/15 border border-flame/40 text-flame px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
        New
      </span>
    )
  }
  if (status === 'read') {
    return (
      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 text-mist px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-medium">
        Active
      </span>
    )
  }
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center rounded-full bg-leaf/15 border border-leaf/40 text-leaf px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
        Resolved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] text-mist/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
      Archived
    </span>
  )
}

// ---------------------------------------------------------------
// Review / Book Again
// ---------------------------------------------------------------

function ReviewBookAgainSection() {
  const [reviewEnabled, setReviewEnabled] = useState(true)
  const [bookEnabled, setBookEnabled] = useState(true)
  return (
    <Card id="reviews">
      <Eyebrow>Reviews & Rebooking</Eyebrow>
      <p className="mt-1 text-xs text-mist">
        Surface a Google review prompt and a Book Again link on the camper
        QR page. Toggle each on/off; the camper hub respects whatever you
        set here in production.
      </p>
      <div className="mt-3 space-y-3">
        <SettingsRow
          label="Show Google review link"
          enabled={reviewEnabled}
          onToggle={() => setReviewEnabled((p) => !p)}
          hint="https://g.page/r/pine-ridge-rv-resort"
        />
        <SettingsRow
          label="Show Book Again link"
          enabled={bookEnabled}
          onToggle={() => setBookEnabled((p) => !p)}
          hint="https://book.example.com/pine-ridge · promo: RETURN10"
        />
      </div>
    </Card>
  )
}

function SettingsRow({
  label,
  enabled,
  onToggle,
  hint,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
  hint: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-cream leading-tight">{label}</p>
        <p className="mt-1 text-[11px] text-mist break-all">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={
          enabled
            ? 'shrink-0 inline-flex items-center gap-1.5 rounded-full bg-leaf/15 border border-leaf/40 text-leaf px-3 py-1 text-[11px] font-semibold'
            : 'shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 text-mist px-3 py-1 text-[11px] font-medium hover:text-cream'
        }
      >
        {enabled ? '✓ Showing' : 'Hidden'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------
// Camper Connections owner view
// ---------------------------------------------------------------

function CamperConnectionsSummarySection() {
  return (
    <Card id="connections">
      <Eyebrow>Camper Connections — owner view</Eyebrow>
      <p className="mt-1 text-xs text-mist leading-snug">
        High-level stats only. You can see opt-in activity; you can&apos;t
        read private camper-to-camper messages. Exact site numbers stay
        hidden in Camper Connections.
      </p>
      <div className="mt-3 grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-4">
        {CC_STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-3"
          >
            <p className="text-[10px] uppercase tracking-wider text-mist leading-snug">
              {s.label}
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold text-cream tabular-nums leading-none">
              {s.value}
            </p>
            <p className="mt-1 text-[10px] text-mist/70 leading-snug">{s.hint}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-1.5 text-xs text-mist leading-relaxed">
        <li>· Camper Connections are optional and privacy-first.</li>
        <li>· Owners do NOT read private camper-to-camper messages.</li>
        <li>· No public group chat. Mutual Waves unlock simple messaging.</li>
        <li>· No exact site numbers. No always-on GPS.</li>
      </ul>
    </Card>
  )
}

// ---------------------------------------------------------------
// Tiny shared primitives
// ---------------------------------------------------------------

function Card({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 shadow-lg shadow-black/20 scroll-mt-20"
    >
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

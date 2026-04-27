'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Lock, LogOut } from 'lucide-react'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

// ----------------------------------------------------------------------------
// Mock data — the dashboard is a sandbox for demos and prospect calls.
// ----------------------------------------------------------------------------

type TravelStyle =
  | 'Full-timer'
  | 'Weekender'
  | 'Snowbird'
  | 'Seasonal guest'
  | 'Camp host'
  | 'Work camper'
  | 'Solo traveler'
  | 'Traveling for work'
  | 'Family traveler'
  | 'Prefer quiet'

const INTERESTS = [
  { slug: 'coffee', label: 'Coffee', emoji: '☕' },
  { slug: 'campfire', label: 'Campfire', emoji: '🔥' },
  { slug: 'dogs', label: 'Dogs', emoji: '🐕' },
  { slug: 'cats', label: 'Cats', emoji: '🐱' },
  { slug: 'hiking', label: 'Hiking', emoji: '🥾' },
  { slug: 'kayaking', label: 'Kayaking', emoji: '🛶' },
  { slug: 'paddle_boarding', label: 'Paddle boarding', emoji: '🏄' },
  { slug: 'boating', label: 'Boating', emoji: '⛵' },
  { slug: 'ebikes', label: 'E-bikes', emoji: '⚡' },
  { slug: 'atv_utv', label: 'ATV/UTV', emoji: '🏍️' },
  { slug: 'sports', label: 'Sports', emoji: '🏆' },
  { slug: 'cards', label: 'Cards', emoji: '🃏' },
  { slug: 'live_music', label: 'Live music', emoji: '🎵' },
] as const

const INTEREST_LABEL: Record<string, string> = Object.fromEntries(
  INTERESTS.map((i) => [i.slug, i.label]),
)
const INTEREST_EMOJI: Record<string, string> = Object.fromEntries(
  INTERESTS.map((i) => [i.slug, i.emoji]),
)

type Camper = {
  id: string
  name: string
  username: string
  status: string | null
  rig: string
  from: string
  years: number
  style: TravelStyle
  interests: string[]
}

const SAMPLE_CAMPERS: Camper[] = [
  {
    id: 'c1',
    name: 'Sarah & Jim',
    username: 'rolling_pines',
    status: 'Coffee on the porch · come say hi',
    rig: 'Class B',
    from: 'Asheville, NC',
    years: 8,
    style: 'Full-timer',
    interests: ['coffee', 'campfire', 'dogs', 'hiking'],
  },
  {
    id: 'c2',
    name: 'Alex',
    username: 'wandering_alex',
    status: 'Reading by the fire',
    rig: 'Travel trailer',
    from: 'Boulder, CO',
    years: 3,
    style: 'Weekender',
    interests: ['hiking', 'kayaking', 'live_music'],
  },
  {
    id: 'c3',
    name: 'The Browns',
    username: 'browns_on_road',
    status: null,
    rig: 'Class A',
    from: 'Tampa, FL',
    years: 12,
    style: 'Snowbird',
    interests: ['cards', 'coffee', 'dogs'],
  },
  {
    id: 'c4',
    name: 'Jordan',
    username: 'jordan_solo',
    status: 'Open to chat',
    rig: 'Sprinter van',
    from: 'Portland, OR',
    years: 2,
    style: 'Solo traveler',
    interests: ['paddle_boarding', 'ebikes', 'coffee'],
  },
  {
    id: 'c5',
    name: 'The Riveras',
    username: 'rivera_family',
    status: 'Kids at the playground',
    rig: 'Fifth wheel',
    from: 'Austin, TX',
    years: 5,
    style: 'Family traveler',
    interests: ['campfire', 'sports', 'kayaking', 'dogs'],
  },
]

const MEETUPS = [
  {
    id: 'm1',
    title: 'Sunset campfire & marshmallows',
    location: 'Fire ring 3',
    time: 'Tonight · 7:30 PM',
    description: "Bring a chair. We'll have hot cocoa. All campers welcome.",
    rsvps: 4,
  },
  {
    id: 'm2',
    title: 'Morning yoga by the lake',
    location: 'Lakeside lawn',
    time: 'Tomorrow · 7:00 AM',
    description: 'Bring a mat. Beginner-friendly. 45 minutes.',
    rsvps: 7,
  },
  {
    id: 'm3',
    title: 'Trail walk to Eagle Lookout',
    location: 'Trailhead parking',
    time: 'Saturday · 9:00 AM',
    description: '4-mile loop, moderate grade. Dogs welcome on leash.',
    rsvps: 11,
  },
]

// ----------------------------------------------------------------------------
// Page — auth gate + dashboard
// ----------------------------------------------------------------------------

const STORAGE_KEY = 'roadwave-owner-token'

type AuthStatus = 'checking' | 'locked' | 'unlocked'

export default function OwnerPage() {
  const [status, setStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from a non-React store
      setStatus('locked')
      return
    }
    fetch('/api/owner-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setStatus('unlocked')
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setStatus('locked')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('locked')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function unlock(token: string) {
    localStorage.setItem(STORAGE_KEY, token)
    setStatus('unlocked')
  }

  function lock() {
    localStorage.removeItem(STORAGE_KEY)
    setStatus('locked')
  }

  if (status === 'checking') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-mist">Checking session…</p>
      </main>
    )
  }

  if (status === 'locked') {
    return <PasswordGate onUnlock={unlock} />
  }

  return <Dashboard onLock={lock} />
}

// ----------------------------------------------------------------------------
// Password gate
// ----------------------------------------------------------------------------

function PasswordGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/owner-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const data = (await res.json()) as { token: string }
        onUnlock(data.token)
      } else if (res.status === 503) {
        setError('Owner access is not configured yet on this deployment.')
      } else {
        setError('Wrong password.')
      }
    } catch {
      setError("Couldn't reach the server. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Logo className="text-3xl" />
        </div>
        <div className="rounded-2xl border border-white/5 bg-card p-6 shadow-2xl shadow-black/40 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-flame/10 text-flame">
              <Lock className="h-6 w-6" aria-hidden />
            </div>
            <Eyebrow>Owner access</Eyebrow>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-cream">
              This area is private.
            </h1>
            <p className="mt-2 font-serif italic text-flame text-base leading-snug">
              Drop in the owner password and you&apos;re in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="sr-only">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                placeholder="Password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
              />
            </label>

            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || password.length === 0}
              className="w-full rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-mist/70">
          Stay signed in on this device. Lock from inside any time.
        </p>
      </div>
    </main>
  )
}

// ----------------------------------------------------------------------------
// Dashboard
// ----------------------------------------------------------------------------

type Tab = 'overview' | 'guests' | 'meetups' | 'stats'

function Dashboard({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-night/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-4 py-3">
          <Logo className="text-2xl" />
          <button
            type="button"
            onClick={onLock}
            className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-cream"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Lock
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 space-y-6">
        <div>
          <Eyebrow>Riverbend RV Park · Owner view</Eyebrow>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-tight">
            Dashboard
          </h1>
          <p className="font-serif italic text-flame text-lg leading-snug">
            Who&apos;s here. What&apos;s on. How it&apos;s going.
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-xl bg-white/5 p-1 text-sm">
          {(
            [
              ['overview', 'Overview'],
              ['guests', 'Guests'],
              ['meetups', 'Meetups'],
              ['stats', 'Stats'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? 'flex-1 rounded-lg bg-flame text-night px-3 py-2 font-semibold shadow-sm whitespace-nowrap'
                  : 'flex-1 rounded-lg text-mist hover:text-cream px-3 py-2 font-medium whitespace-nowrap transition-colors'
              }
            >
              {label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'overview' && <OverviewTab />}
          {tab === 'guests' && <GuestsTab />}
          {tab === 'meetups' && <MeetupsTab />}
          {tab === 'stats' && <StatsTab />}
        </div>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-mist/70">
        <p>Mock data — for prospect demos and owner walkthroughs.</p>
      </footer>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Tabs
// ----------------------------------------------------------------------------

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Active guests" value={SAMPLE_CAMPERS.length.toString()} />
        <Stat label="Today's meetups" value={MEETUPS.length.toString()} />
        <Stat label="Avg. stay (h)" value="19" />
        <Stat label="Mutual waves" value="11" />
      </div>

      <Section eyebrow="Tonight's meetups">
        <ul className="space-y-2">
          {MEETUPS.slice(0, 2).map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20"
            >
              <p className="font-semibold text-cream">{m.title}</p>
              <p className="mt-0.5 text-xs text-mist">{m.time}</p>
              <p className="mt-0.5 text-xs text-cream/80">{m.location}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Recent activity">
        <ul className="space-y-1.5">
          <ActivityRow text="@rolling_pines checked in" minutes={3} />
          <ActivityRow text="@wandering_alex waved at @rolling_pines" minutes={12} />
          <ActivityRow text="@browns_on_road posted to crossed paths" minutes={42} />
          <ActivityRow text="Meetup “Sunset campfire” got 4 RSVPs" minutes={55} />
          <ActivityRow text="@jordan_solo joined the campground" minutes={120} />
        </ul>
      </Section>
    </div>
  )
}

function GuestsTab() {
  return (
    <div className="space-y-3">
      <Eyebrow>Currently checked in · {SAMPLE_CAMPERS.length}</Eyebrow>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SAMPLE_CAMPERS.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-cream leading-tight">{c.name}</p>
                <p className="text-xs text-mist">@{c.username}</p>
                <span className="mt-1.5 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-xs font-semibold text-flame">
                  {c.style}
                </span>
              </div>
              <span className="text-xs text-mist whitespace-nowrap">
                {c.years}y RVing
              </span>
            </div>
            {c.status && (
              <p className="mt-2 font-serif italic text-flame text-sm leading-snug">
                &ldquo;{c.status}&rdquo;
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                <span className="text-mist mr-1">Rig</span>
                <span className="text-cream">{c.rig}</span>
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                <span className="text-mist mr-1">From</span>
                <span className="text-cream">{c.from}</span>
              </span>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1">
              {c.interests.map((slug) => (
                <li
                  key={slug}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cream"
                >
                  <span aria-hidden>{INTEREST_EMOJI[slug] ?? ''}</span>
                  {INTEREST_LABEL[slug] ?? slug}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MeetupsTab() {
  return (
    <div className="space-y-4">
      <button
        type="button"
        className="w-full sm:w-auto rounded-xl bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400"
      >
        + Post a meetup
      </button>
      <ul className="space-y-2">
        {MEETUPS.map((m) => (
          <li
            key={m.id}
            className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20"
          >
            <p className="font-semibold text-cream leading-tight">{m.title}</p>
            <p className="mt-0.5 text-xs text-mist">{m.time}</p>
            <span className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-cream">
              {m.location}
            </span>
            <p className="mt-2 text-sm text-cream/85 leading-snug">{m.description}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-mist">
              <span>{m.rsvps} RSVPs</span>
              <span aria-hidden>·</span>
              <button
                type="button"
                className="text-flame underline-offset-2 hover:underline"
              >
                Edit
              </button>
              <span aria-hidden>·</span>
              <button type="button" className="hover:text-red-300">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatsTab() {
  const interestCounts: Record<string, number> = {}
  for (const c of SAMPLE_CAMPERS) {
    for (const slug of c.interests) {
      interestCounts[slug] = (interestCounts[slug] ?? 0) + 1
    }
  }
  const interestRows = Object.entries(interestCounts)
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)

  const styleCounts: Record<string, number> = {}
  for (const c of SAMPLE_CAMPERS) {
    styleCounts[c.style] = (styleCounts[c.style] ?? 0) + 1
  }
  const styleRows = Object.entries(styleCounts)
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count)

  const total = SAMPLE_CAMPERS.length

  return (
    <div className="space-y-6">
      <Section eyebrow="Top interests">
        <ul className="space-y-1.5">
          {interestRows.map((row) => (
            <BarRow
              key={row.slug}
              label={
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{INTEREST_EMOJI[row.slug]}</span>
                  {INTEREST_LABEL[row.slug]}
                </span>
              }
              count={row.count}
              total={total}
            />
          ))}
        </ul>
      </Section>

      <Section eyebrow="Travel style breakdown">
        <ul className="space-y-1.5">
          {styleRows.map((row) => (
            <BarRow key={row.style} label={row.style} count={row.count} total={total} />
          ))}
        </ul>
      </Section>

      <Section eyebrow="Engagement (last 7 days)">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Check-ins" value="42" />
          <Stat label="Waves" value="89" />
          <Stat label="Matches" value="23" />
        </div>
      </Section>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Bits
// ----------------------------------------------------------------------------

function Section({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <Eyebrow>{eyebrow}</Eyebrow>
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-card p-3 shadow shadow-black/20">
      <p className="text-[10px] uppercase tracking-wide text-mist">{label}</p>
      <p className="font-display text-2xl sm:text-3xl font-extrabold text-cream leading-none mt-1">
        {value}
      </p>
    </div>
  )
}

function ActivityRow({ text, minutes }: { text: string; minutes: number }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-card/60 border border-white/5 px-3 py-2">
      <span className="text-sm text-cream">{text}</span>
      <span className="text-xs text-mist whitespace-nowrap">{minutes}m ago</span>
    </li>
  )
}

function BarRow({
  label,
  count,
  total,
}: {
  label: React.ReactNode
  count: number
  total: number
}) {
  const pct = Math.round((count / total) * 100)
  return (
    <li className="rounded-lg border border-white/5 bg-card/70 px-3 py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-cream">{label}</span>
        <span className="text-mist tabular-nums">
          {count} · {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-flame"
          style={{ width: `${Math.max(8, pct)}%` }}
          aria-hidden
        />
      </div>
    </li>
  )
}

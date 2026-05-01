'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { SafetyBanner } from '@/components/ui/safety-banner'

// Mock guest-experience preview used both in the InteractiveDemo wizard and
// on the shareable /demo/<slug> page. Two exports:
//
//   <GuestPreview/>            — read-only guest view: 3 tabs (Check In,
//                                Nearby, Meetups). Used on /demo/<slug>.
//   <InteractiveDemoPreview/>  — Guest+Owner views with shared state.
//                                Owner can post a bulletin and create a
//                                meetup; both surface in the guest view
//                                live. Used in the wizard.

// ---------------------------------------------------------------------------
// Types + mocks
// ---------------------------------------------------------------------------

type CampgroundShape = {
  campgroundName: string
  logoUrl: string | null
  city: string | null
  region: string | null
  /** Optional caption shown under the QR. */
  checkInUrl?: string
}

type Bulletin = { id: string; message: string; postedAt: string }
type UserMeetup = { id: string; title: string; location: string; when: string }

type MockCamper = {
  displayName: string
  username: string
  rig: string
  hometown?: string
  style: string
  note?: string
  interests: string[]
}

const NEARBY_MOCK: MockCamper[] = [
  {
    displayName: 'Riley & June',
    username: 'rolling_pines',
    rig: 'Class B',
    hometown: 'Asheville, NC',
    style: 'Full-timer',
    note: 'Up early, good coffee, golden retriever for trade.',
    interests: ['🏞️ Hiking', '☕ Coffee', '🐕 Dogs'],
  },
  {
    displayName: 'Marisol',
    username: 'desert_marisol',
    rig: 'Travel trailer',
    hometown: 'Flagstaff, AZ',
    style: 'Solo traveler',
    note: 'Always up for a campfire chat.',
    interests: ['🔥 Fires', '📷 Photography', '🌵 Desert'],
  },
  {
    displayName: 'The Caldwell crew',
    username: 'caldwell_4',
    rig: 'Fifth wheel',
    hometown: 'Nashville, TN',
    style: 'Family traveler',
    note: 'Two kids who love bikes. Looking for ride buddies.',
    interests: ['🚴 Biking', '🎣 Fishing', '🏊 Swimming'],
  },
  {
    displayName: 'Hank',
    username: 'hank_on_wheels',
    rig: 'Class A',
    hometown: 'Boise, ID',
    style: 'Snowbird',
    interests: ['🎸 Music', '🥾 Hiking'],
  },
  {
    displayName: 'Aiyana',
    username: 'aiyana_roams',
    rig: 'Truck camper',
    hometown: 'Bend, OR',
    style: 'Weekender',
    note: 'Trail running before sunrise.',
    interests: ['🏃 Running', '🧘 Yoga'],
  },
]

const MEETUPS_MOCK: UserMeetup[] = [
  {
    id: 'mock-1',
    title: 'Happy Hour at Site 12',
    when: 'Tonight · 5:30 PM',
    location: 'Site 12 fire ring',
  },
  {
    id: 'mock-2',
    title: 'Morning Dog Walk',
    when: 'Tomorrow · 7:15 AM',
    location: 'Camp store loop',
  },
  {
    id: 'mock-3',
    title: 'Trailhead carpool — Eagle Creek',
    when: 'Saturday · 8:00 AM',
    location: 'Front gate parking',
  },
]

// ---------------------------------------------------------------------------
// Public read-only preview (used on /demo/<slug>)
// ---------------------------------------------------------------------------

export function GuestPreview(props: CampgroundShape) {
  return (
    <PreviewShell {...props}>
      <GuestTabs
        campgroundName={props.campgroundName}
        location={[props.city, props.region].filter(Boolean).join(', ')}
        checkInUrl={props.checkInUrl}
        bulletins={[]}
        extraMeetups={[]}
      />
    </PreviewShell>
  )
}

// ---------------------------------------------------------------------------
// Interactive wizard preview (used in the /campgrounds wizard)
// ---------------------------------------------------------------------------

type View = 'guest' | 'owner'

export function InteractiveDemoPreview(props: CampgroundShape) {
  const [view, setView] = useState<View>('guest')
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [extraMeetups, setExtraMeetups] = useState<UserMeetup[]>([])
  const location = [props.city, props.region].filter(Boolean).join(', ')

  function postBulletin(message: string) {
    setBulletins((prev) => [
      {
        id: `b-${Date.now()}`,
        message,
        postedAt: new Date().toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      },
      ...prev,
    ])
  }

  function createMeetup(m: { title: string; location: string; when: string }) {
    setExtraMeetups((prev) => [
      { id: `u-${Date.now()}`, ...m },
      ...prev,
    ])
  }

  return (
    <div className="space-y-3">
      <div role="tablist" className="grid grid-cols-2 rounded-full border border-white/10 bg-card p-1 text-sm">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'guest'}
          onClick={() => setView('guest')}
          className={
            view === 'guest'
              ? 'rounded-full bg-flame text-night px-3 py-1.5 font-semibold transition-colors'
              : 'rounded-full text-mist hover:text-cream px-3 py-1.5 transition-colors'
          }
        >
          Guest view
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'owner'}
          onClick={() => setView('owner')}
          className={
            view === 'owner'
              ? 'rounded-full bg-flame text-night px-3 py-1.5 font-semibold transition-colors'
              : 'rounded-full text-mist hover:text-cream px-3 py-1.5 transition-colors'
          }
        >
          Owner dashboard
        </button>
      </div>

      <PreviewShell {...props}>
        {view === 'guest' ? (
          <GuestTabs
            campgroundName={props.campgroundName}
            location={location}
            checkInUrl={props.checkInUrl}
            bulletins={bulletins}
            extraMeetups={extraMeetups}
          />
        ) : (
          <OwnerDashboard
            campgroundName={props.campgroundName}
            bulletins={bulletins}
            extraMeetups={extraMeetups}
            onPostBulletin={postBulletin}
            onCreateMeetup={createMeetup}
          />
        )}
      </PreviewShell>

      {view === 'owner' && (
        <p className="text-center text-[11px] text-mist/70 px-2">
          Post a bulletin or create a meetup, then switch to{' '}
          <span className="text-cream">Guest view</span> to see it land.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared shell + identity row
// ---------------------------------------------------------------------------

function PreviewShell({
  campgroundName,
  logoUrl,
  city,
  region,
  children,
}: CampgroundShape & { children: React.ReactNode }) {
  const location = [city, region].filter(Boolean).join(', ') || ''
  const initial = campgroundName.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="rounded-3xl border border-white/10 bg-night overflow-hidden shadow-2xl shadow-black/40">
      <div className="bg-flame text-night text-center py-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase">
        Powered by RoadWave <span aria-hidden>👋</span>
      </div>
      <CampgroundIdentityRow
        campgroundName={campgroundName}
        location={location}
        logoUrl={logoUrl}
        initial={initial}
      />
      {children}
    </div>
  )
}

function CampgroundIdentityRow({
  campgroundName,
  location,
  logoUrl,
  initial,
}: {
  campgroundName: string
  location: string
  logoUrl: string | null
  initial: string
}) {
  return (
    <div className="px-4 sm:px-6 py-4 flex items-center gap-3 border-b border-white/5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview uses an Object URL or remote URL we render once
        <img
          src={logoUrl}
          alt={`${campgroundName} logo`}
          className="h-12 w-12 rounded-xl border border-white/10 bg-card object-cover shrink-0"
        />
      ) : (
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-flame/30 bg-flame/10 font-display text-base font-extrabold text-flame"
          aria-hidden
        >
          {initial}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-display text-lg font-extrabold text-cream truncate">
          {campgroundName}
        </p>
        {location && <p className="text-xs text-mist truncate">{location}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Guest tabs
// ---------------------------------------------------------------------------

function GuestTabs({
  campgroundName,
  location,
  checkInUrl,
  bulletins,
  extraMeetups,
}: {
  campgroundName: string
  location: string
  checkInUrl?: string
  bulletins: Bulletin[]
  extraMeetups: UserMeetup[]
}) {
  const [tab, setTab] = useState<'checkin' | 'nearby' | 'meetups'>('checkin')
  return (
    <>
      <div className="px-3 sm:px-4 pt-3 border-b border-white/5">
        <nav role="tablist" className="flex gap-1 sm:gap-2 -mb-px">
          <TabButton active={tab === 'checkin'} onClick={() => setTab('checkin')}>
            Check In
          </TabButton>
          <TabButton active={tab === 'nearby'} onClick={() => setTab('nearby')}>
            Campers Here
          </TabButton>
          <TabButton active={tab === 'meetups'} onClick={() => setTab('meetups')}>
            Meetups
          </TabButton>
        </nav>
      </div>
      {tab === 'nearby' && (
        <div className="px-4 sm:px-6 pt-3 -mb-2">
          <SafetyBanner message="RoadWave helps campers connect, but you choose if, when, and where to meet. Meet in public campground areas, trust your instincts, and report anything that feels off." />
        </div>
      )}
      {tab === 'meetups' && (
        <div className="px-4 sm:px-6 pt-3 -mb-2">
          <SafetyBanner message="Meet smart: Use public campground areas, let someone know where you are going, and report pressure, harassment, or suspicious behavior." />
        </div>
      )}
      <div className="px-4 sm:px-6 py-5">
        {tab === 'checkin' && (
          <CheckInPanel
            campgroundName={campgroundName}
            location={location}
            checkInUrl={checkInUrl}
            bulletins={bulletins}
          />
        )}
        {tab === 'nearby' && <NearbyPanel campgroundName={campgroundName} />}
        {tab === 'meetups' && <MeetupsPanel extraMeetups={extraMeetups} />}
      </div>
    </>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? 'rounded-t-md border-b-2 border-flame px-3 sm:px-4 py-2 text-sm font-semibold text-cream'
          : 'rounded-t-md border-b-2 border-transparent px-3 sm:px-4 py-2 text-sm text-mist hover:text-cream'
      }
    >
      {children}
    </button>
  )
}

function CheckInPanel({
  campgroundName,
  location,
  checkInUrl,
  bulletins,
}: {
  campgroundName: string
  location: string
  checkInUrl?: string
  bulletins: Bulletin[]
}) {
  const latest = bulletins[0]
  return (
    <div className="space-y-4">
      {latest && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-flame/40 bg-flame/[0.08] p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
            Camp bulletin
          </p>
          <p className="mt-1 text-sm text-cream leading-snug">{latest.message}</p>
          <p className="mt-1 text-[10px] text-mist/70">Posted {latest.postedAt}</p>
        </div>
      )}
      <div className="text-center space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Welcome to
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-cream leading-tight">
          {campgroundName}
        </h2>
        {location && <p className="text-xs text-mist">{location}</p>}
      </div>
      <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-5 space-y-4">
        <p className="text-center font-serif italic text-flame text-base leading-snug">
          24 hours. Then you&apos;re invisible again.
        </p>
        <div className="mx-auto w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-white p-3 grid place-items-center">
          <DemoQrSvg />
        </div>
        <p className="text-center text-xs text-mist">
          {checkInUrl ?? 'Sample QR — scan to check in for 24 hours.'}
        </p>
        <button
          type="button"
          className="w-full rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15"
          disabled
        >
          Check in <span aria-hidden>👋</span>
        </button>
      </div>
      <p className="text-center text-[11px] text-mist/70">
        Exact campsite is never shown. Use Quiet or Invisible mode anytime.
      </p>
    </div>
  )
}

function NearbyPanel({ campgroundName }: { campgroundName: string }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Currently at {campgroundName}
        </p>
        <h2 className="mt-0.5 font-display text-xl font-extrabold text-cream">
          Campers Checked In Here
        </h2>
        <p className="text-xs text-mist">Who&apos;s here, what they&apos;re into.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {NEARBY_MOCK.map((c) => (
          <CamperPreviewCard key={c.username} camper={c} />
        ))}
      </ul>
      <p className="text-center text-[11px] text-mist/70 pt-1">
        Suggest meeting in a public campground area.
      </p>
    </div>
  )
}

function CamperPreviewCard({ camper }: { camper: MockCamper }) {
  return (
    <li className="rounded-2xl border border-white/5 bg-card p-4 flex flex-col gap-2 shadow-lg shadow-black/20">
      <div className="flex items-start gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-flame/30 bg-flame/10 font-display text-base font-extrabold text-flame"
          aria-hidden
        >
          {camper.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-cream truncate">{camper.displayName}</p>
          <p className="text-xs text-mist truncate">@{camper.username}</p>
          {camper.style && (
            <span className="mt-1 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[11px] font-semibold text-flame">
              {camper.style}
            </span>
          )}
        </div>
      </div>
      {camper.note && (
        <p className="font-serif italic text-flame text-sm leading-snug">
          &ldquo;{camper.note}&rdquo;
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Pill label="Rig" value={camper.rig} />
        {camper.hometown && <Pill label="From" value={camper.hometown} />}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {camper.interests.map((i) => (
          <li
            key={i}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-cream"
          >
            {i}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2 text-sm font-semibold"
        disabled
      >
        Wave <span aria-hidden>👋</span>
      </button>
    </li>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]">
      <span className="text-mist mr-1">{label}</span>
      <span className="text-cream">{value}</span>
    </span>
  )
}

function MeetupsPanel({ extraMeetups }: { extraMeetups: UserMeetup[] }) {
  const all = [...extraMeetups, ...MEETUPS_MOCK]
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Hosted at your campground
        </p>
        <h2 className="mt-0.5 font-display text-xl font-extrabold text-cream">
          Meetups
        </h2>
        <p className="text-xs text-mist">Drop in. No RSVP needed.</p>
      </div>
      <ul className="space-y-2">
        {all.map((m, i) => (
          <li
            key={m.id}
            className={
              i < extraMeetups.length
                ? 'rounded-2xl border border-flame/60 bg-flame/[0.08] p-4'
                : 'rounded-2xl border border-flame/40 bg-flame/[0.04] p-4'
            }
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-cream leading-tight">{m.title}</h3>
              {i < extraMeetups.length && (
                <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-flame shrink-0">
                  New
                </span>
              )}
            </div>
            <p className="text-xs text-mist mt-0.5">{m.when}</p>
            {m.location && (
              <span className="mt-1.5 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2.5 py-0.5 text-xs text-flame">
                {m.location}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Owner dashboard view (interactive — bulletin + meetup creator + stats)
// ---------------------------------------------------------------------------

function OwnerDashboard({
  campgroundName,
  bulletins,
  extraMeetups,
  onPostBulletin,
  onCreateMeetup,
}: {
  campgroundName: string
  bulletins: Bulletin[]
  extraMeetups: UserMeetup[]
  onPostBulletin: (message: string) => void
  onCreateMeetup: (m: { title: string; location: string; when: string }) => void
}) {
  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Owner · {campgroundName}
        </p>
        <h2 className="mt-0.5 font-display text-xl font-extrabold text-cream">
          Your dashboard
        </h2>
      </div>

      <p className="rounded-xl border border-flame/25 bg-flame/[0.05] px-4 py-3 text-xs text-cream/90 leading-relaxed">
        RoadWave is designed to encourage real-life campground connection
        without exact site sharing, public group chats, or pressure to meet.
      </p>

      <section className="grid grid-cols-2 gap-2">
        <StatCard label="Checked in today" value="12" emphasis />
        <StatCard label="Check-ins this week" value="47" />
        <StatCard label="Waves sent this week" value="23" />
        <StatCard
          label="Meetups created"
          value={String(MEETUPS_MOCK.length + extraMeetups.length)}
        />
      </section>

      <BulletinComposer
        bulletins={bulletins}
        onPost={onPostBulletin}
      />

      <MeetupComposer
        meetups={extraMeetups}
        onCreate={onCreateMeetup}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div
      className={
        emphasis
          ? 'rounded-xl border border-flame/40 bg-flame/[0.08] p-3'
          : 'rounded-xl border border-white/5 bg-card p-3'
      }
    >
      <p className="text-[10px] uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-extrabold text-cream">
        {value}
      </p>
    </div>
  )
}

function BulletinComposer({
  bulletins,
  onPost,
}: {
  bulletins: Bulletin[]
  onPost: (message: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [justPosted, setJustPosted] = useState(false)
  const ready = draft.trim().length > 0 && draft.length <= 280

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ready) return
    onPost(draft.trim())
    setDraft('')
    setJustPosted(true)
    window.setTimeout(() => setJustPosted(false), 2200)
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Bulletin board
        </p>
        <h3 className="mt-0.5 font-semibold text-cream">Post an announcement</h3>
        <p className="text-xs text-mist">
          Sticks at the top of the Check In tab for everyone on site.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={2}
          maxLength={280}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Free coffee at the office until 10am ☕"
          className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-mist">{draft.length}/280</p>
          <button
            type="submit"
            disabled={!ready}
            className="rounded-lg bg-flame text-night px-4 py-1.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
          >
            Post bulletin
          </button>
        </div>
      </form>
      {justPosted && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-leaf/40 bg-leaf/10 p-2 text-xs text-leaf"
        >
          Posted. Switch to Guest view to see it live.
        </p>
      )}
      {bulletins.length > 0 && (
        <div className="border-t border-white/5 pt-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-mist">
            Currently posted
          </p>
          <ul className="space-y-1.5">
            {bulletins.slice(0, 3).map((b) => (
              <li
                key={b.id}
                className="rounded-lg border border-flame/30 bg-flame/[0.05] px-3 py-2"
              >
                <p className="text-sm text-cream leading-snug">{b.message}</p>
                <p className="text-[10px] text-mist/70 mt-0.5">{b.postedAt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function MeetupComposer({
  meetups,
  onCreate,
}: {
  meetups: UserMeetup[]
  onCreate: (m: { title: string; location: string; when: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [when, setWhen] = useState('')
  const [justCreated, setJustCreated] = useState(false)
  const ready =
    title.trim().length > 0 && location.trim().length > 0 && when.trim().length > 0

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ready) return
    onCreate({
      title: title.trim(),
      location: location.trim(),
      when: when.trim(),
    })
    setTitle('')
    setLocation('')
    setWhen('')
    setJustCreated(true)
    window.setTimeout(() => setJustCreated(false), 2200)
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Meetups
        </p>
        <h3 className="mt-0.5 font-semibold text-cream">Create a meetup</h3>
        <p className="text-xs text-mist">
          Appears at the top of the guest Meetups tab in real time.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-3">
        <input
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Dog walk)"
          className="sm:col-span-3 w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
        />
        <input
          type="text"
          maxLength={120}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (e.g. Site 12)"
          className="sm:col-span-2 w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
        />
        <input
          type="text"
          maxLength={60}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          placeholder="When (e.g. Tonight 6pm)"
          className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
        />
        <button
          type="submit"
          disabled={!ready}
          className="sm:col-span-3 rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
        >
          Create meetup
        </button>
      </form>
      {justCreated && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-leaf/40 bg-leaf/10 p-2 text-xs text-leaf"
        >
          Created. Switch to Guest view → Meetups to see it live.
        </p>
      )}
      {meetups.length > 0 && (
        <p className="text-[11px] text-mist border-t border-white/5 pt-2">
          You&apos;ve added {meetups.length}{' '}
          {meetups.length === 1 ? 'meetup' : 'meetups'} this session.
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Mock QR
// ---------------------------------------------------------------------------

function DemoQrSvg() {
  const { cells: pattern, N } = useMemo(() => {
    const N = 21
    const out: boolean[] = []
    for (let i = 0; i < N * N; i++) {
      out.push((i * 37 + (i % 5) * 13) % 7 < 3)
    }
    function paintFinder(cx: number, cy: number) {
      for (let y = cy; y < cy + 7; y++) {
        for (let x = cx; x < cx + 7; x++) {
          const onBorder = y === cy || y === cy + 6 || x === cx || x === cx + 6
          const inner = y >= cy + 2 && y <= cy + 4 && x >= cx + 2 && x <= cx + 4
          if (onBorder || inner) out[y * N + x] = true
          else out[y * N + x] = false
        }
      }
    }
    paintFinder(0, 0)
    paintFinder(N - 7, 0)
    paintFinder(0, N - 7)
    return { cells: out, N }
  }, [])
  const cell = 100 / N
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      role="img"
      aria-label="Sample QR code"
    >
      {pattern.map((on, idx) => {
        if (!on) return null
        const x = (idx % N) * cell
        const y = Math.floor(idx / N) * cell
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={cell + 0.3}
            height={cell + 0.3}
            fill="#0a0f1c"
          />
        )
      })}
    </svg>
  )
}

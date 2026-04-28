'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { useState } from 'react'

const AMENITY_LABEL: Record<string, string> = {
  full_hookups: 'Full hookups',
  water_electric: 'Water/Electric',
  tent_sites: 'Tent sites',
  wifi: 'WiFi',
  pool: 'Pool',
  dog_friendly: 'Dog-friendly',
  laundry: 'Laundry',
  store: 'Store',
  restrooms: 'Restrooms',
  showers: 'Showers',
}

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'checkin', label: 'Check in' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'meetups', label: 'Meetups' },
  { id: 'waves', label: 'Waves' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'paths', label: 'Crossed' },
] as const

type TabId = (typeof TABS)[number]['id']

type Meetup = {
  id: string
  title: string
  description: string | null
  location: string | null
  startAt: string
}

type Props = {
  campground: {
    name: string
    logoUrl: string | null
    amenities: string[]
    timezone: string
  }
  bulletin: { message: string; category: string } | null
  hostedMeetups: Meetup[]
  camperMeetups: Meetup[]
}

export function OwnerPreview({
  campground,
  bulletin,
  hostedMeetups,
  camperMeetups,
}: Props) {
  const [tab, setTab] = useState<TabId>('home')

  return (
    <div className="min-h-screen flex flex-col bg-night">
      {/* Sticky preview banner. Distinct purple/violet so it can't be
          mistaken for the orange brand color. */}
      <div className="sticky top-0 z-30 bg-purple-600 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <p className="text-xs sm:text-sm font-semibold tracking-wide">
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 mr-2">
            Preview mode
          </span>
          This is what your guests see
        </p>
        <Link
          href="/owner/dashboard"
          className="rounded-md bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors"
        >
          Exit Preview ✕
        </Link>
      </div>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-5 space-y-5">
        {/* Simulated header (mirrors the guest authed layout's chrome) */}
        <header className="border-b border-white/5 pb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-mist mb-1">
            Simulated guest view
          </p>
          <div className="flex items-center gap-3">
            {campground.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded
              <img
                src={campground.logoUrl}
                alt={`${campground.name} logo`}
                className="h-10 w-10 rounded-lg border border-white/10 bg-card object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg border border-dashed border-white/15 bg-card grid place-items-center text-xl">
                🏕️
              </div>
            )}
            <div>
              <p className="font-display font-extrabold text-cream text-lg leading-tight">
                {campground.name}
              </p>
              <p className="text-[10px] text-mist">
                {campground.timezone}
              </p>
            </div>
          </div>
        </header>

        {/* Tab nav — same structure as the guest (app) AppNav */}
        <nav>
          <ul className="grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={
                      active
                        ? 'block w-full text-center rounded-md bg-flame/15 text-flame px-2 py-1.5 font-semibold'
                        : 'block w-full text-center rounded-md text-mist px-2 py-1.5 hover:text-cream hover:bg-white/5 transition-colors'
                    }
                    aria-current={active ? 'page' : undefined}
                  >
                    {t.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="pt-2">
          {tab === 'home' && (
            <HomeTab
              campground={campground}
              bulletin={bulletin}
            />
          )}
          {tab === 'checkin' && <CheckInTab campgroundName={campground.name} />}
          {tab === 'nearby' && <NearbyTab />}
          {tab === 'meetups' && (
            <MeetupsTab
              campgroundName={campground.name}
              hosted={hostedMeetups}
              camper={camperMeetups}
              timezone={campground.timezone}
            />
          )}
          {tab === 'waves' && <WavesTab />}
          {tab === 'privacy' && <PrivacyTab />}
          {tab === 'paths' && <CrossedTab />}
        </div>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab content
// ---------------------------------------------------------------------------

function HomeTab({
  campground,
  bulletin,
}: {
  campground: Props['campground']
  bulletin: Props['bulletin']
}) {
  const amenityLabels = campground.amenities
    .map((a) => AMENITY_LABEL[a] ?? a)
    .filter(Boolean)
  return (
    <div className="space-y-5">
      {bulletin && (
        <div className="rounded-2xl border border-flame/40 bg-flame/[0.06] p-4 flex items-start gap-3">
          {campground.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded
            <img
              src={campground.logoUrl}
              alt=""
              className="h-10 w-10 rounded-lg border border-white/10 bg-card object-cover shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg border border-flame/30 bg-flame/10 grid place-items-center text-lg shrink-0">
              🏕️
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-flame">
              {bulletin.category}
            </span>
            <p className="mt-1 text-sm text-cream leading-snug">
              {bulletin.message}
            </p>
          </div>
        </div>
      )}

      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-2.5 py-1 text-[11px] font-semibold text-leaf">
          <span aria-hidden>✓</span>
          Checked in
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream leading-tight">
          Welcome to {campground.name}
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          You&apos;re checked in for 24 hours. See who&apos;s open to a friendly
          wave today.
        </p>
      </header>

      {amenityLabels.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
            What&apos;s here
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {amenityLabels.map((label) => (
              <li
                key={label}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-cream"
              >
                {label}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function CheckInTab({ campgroundName }: { campgroundName: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-leaf/40 bg-leaf/10 p-4 flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          ✓
        </span>
        <div>
          <p className="font-semibold text-leaf">
            Checked in to {campgroundName}
          </p>
          <p className="mt-1 text-xs text-mist leading-snug">
            Guests are visible for 24 hours from check-in. Then they&apos;re
            automatically invisible again unless they re-scan.
          </p>
        </div>
      </div>
      <PreviewNote>
        Guests scan your QR code at the entrance to land in this state. There&apos;s
        nothing else for them to do here once they&apos;re in.
      </PreviewNote>
    </div>
  )
}

function NearbyTab() {
  return (
    <div className="space-y-3">
      <header>
        <h2 className="font-display text-lg font-extrabold text-cream">
          Nearby campers
        </h2>
        <p className="text-xs text-mist">
          Wave when the vibe feels right.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
        No other campers are checked in right now. As guests scan in, they&apos;ll
        appear here for each other to wave at.
      </div>
      <PreviewNote>
        Each guest sees the others by travel style and shared interests — never
        by site number. Guests can filter by interests or hide themselves
        entirely with the Privacy mode tab.
      </PreviewNote>
    </div>
  )
}

function MeetupsTab({
  campgroundName,
  hosted,
  camper,
  timezone,
}: {
  campgroundName: string
  hosted: Meetup[]
  camper: Meetup[]
  timezone: string
}) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-lg font-extrabold text-cream">
          What&apos;s happening
        </h2>
        <p className="text-xs text-mist">
          From the campground and from neighbors.
        </p>
      </header>

      <section className="space-y-2">
        <SectionLabel verified>Hosted by {campgroundName}</SectionLabel>
        {hosted.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-flame/30 bg-flame/[0.04] p-5 text-center text-sm text-mist">
            You haven&apos;t posted a meetup yet.{' '}
            <Link
              href="/owner/meetups"
              className="text-flame underline-offset-2 hover:underline"
            >
              Post one →
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {hosted.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-flame/40 bg-flame/[0.04] p-4"
              >
                <div className="flex items-start gap-2">
                  <h3 className="flex-1 font-semibold text-cream leading-tight">
                    {m.title}
                  </h3>
                  <span
                    aria-label="Posted by the campground"
                    className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-flame text-night text-[10px] font-bold leading-none"
                  >
                    ✓
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-mist">
                  {format(new Date(m.startAt), 'EEE, MMM d · h:mm a')}{' '}
                  <span className="text-mist/60">({timezone})</span>
                </p>
                {m.location && (
                  <span className="mt-1.5 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] text-flame">
                    {m.location}
                  </span>
                )}
                {m.description && (
                  <p className="mt-2 text-sm text-cream/90 whitespace-pre-line">
                    {m.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <SectionLabel>Posted by campers</SectionLabel>
        {camper.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-5 text-center text-sm text-mist">
            No camper posts yet — this section fills in as guests post their
            own activities.
          </p>
        ) : (
          <ul className="space-y-2">
            {camper.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-white/5 bg-card p-4"
              >
                <h3 className="text-sm font-semibold text-cream leading-tight">
                  {m.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-mist">
                  {format(new Date(m.startAt), 'EEE, MMM d · h:mm a')}
                </p>
                {m.description && (
                  <p className="mt-2 text-xs text-cream/90 leading-snug whitespace-pre-line">
                    {m.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function WavesTab() {
  return (
    <div className="space-y-3">
      <header>
        <h2 className="font-display text-lg font-extrabold text-cream">
          Waves
        </h2>
        <p className="text-xs text-mist">
          Everyone a guest has waved at — matched or not.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
        Each guest sees their own private list here. Owners never see this —
        wave history is between the two campers, full stop.
      </div>
    </div>
  )
}

function PrivacyTab() {
  const modes = [
    {
      icon: '👁',
      label: 'Visible',
      desc: 'You appear to other checked-in campers and are open to waves.',
    },
    {
      icon: '🤫',
      label: 'Quiet',
      desc: 'You stay hidden unless you choose to wave first.',
    },
    {
      icon: '👻',
      label: 'Invisible',
      desc: 'You can browse privately without appearing to anyone.',
    },
  ]
  return (
    <div className="space-y-3">
      <header>
        <h2 className="font-display text-lg font-extrabold text-cream">
          Privacy mode
        </h2>
        <p className="text-xs text-mist">
          Three settings. Guests are always in control.
        </p>
      </header>
      <ul className="space-y-2">
        {modes.map((m) => (
          <li
            key={m.label}
            className="rounded-2xl border border-white/10 bg-card p-3 flex items-start gap-3"
          >
            <span className="text-2xl leading-none" aria-hidden>
              {m.icon}
            </span>
            <div>
              <p className="font-semibold text-cream text-sm">{m.label}</p>
              <p className="text-xs text-mist leading-snug">{m.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CrossedTab() {
  return (
    <div className="space-y-3">
      <header>
        <h2 className="font-display text-lg font-extrabold text-cream">
          Crossed paths
        </h2>
        <p className="text-xs text-mist">
          People a guest has camped near before.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
        Each guest sees their own private history of mutual waves across
        every RoadWave campground they&apos;ve visited. Owners never see this.
      </div>
    </div>
  )
}

function SectionLabel({
  children,
  verified,
}: {
  children: React.ReactNode
  verified?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mist">
        {children}
      </p>
      {verified && (
        <span
          aria-label="Verified campground"
          className="grid h-3 w-3 shrink-0 place-items-center rounded-full bg-flame text-night text-[8px] font-bold leading-none"
        >
          ✓
        </span>
      )}
    </div>
  )
}

function PreviewNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-[11px] text-purple-200/90 leading-snug italic">
      {children}
    </p>
  )
}

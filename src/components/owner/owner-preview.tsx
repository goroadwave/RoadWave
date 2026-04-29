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
    address: string | null
    phone: string | null
    website: string | null
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
    <div
      className="op-root min-h-screen flex flex-col"
      style={{
        backgroundColor: '#0a0f1c',
        color: '#f5ecd9',
        fontFamily:
          'var(--font-dm-sans), -apple-system, system-ui, sans-serif',
      }}
    >
      {/* Scoped fallback CSS — runs whether or not Tailwind utilities
          resolve. Keeps the page on-brand if anything in the build
          pipeline strips or fails to generate utility classes. */}
      <style>{`
        .op-root { -webkit-font-smoothing: antialiased; }
        .op-root ul, .op-root ol { list-style: none; padding: 0; margin: 0; }
        .op-root a { color: inherit; text-decoration: none; }
        .op-root button { font: inherit; }
        .op-banner { background: #7c3aed; color: #fff; }
        .op-banner-btn { background: rgba(255,255,255,0.18); color: #fff; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .op-banner-btn:hover { background: rgba(255,255,255,0.28); }
        .op-tabs-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
        .op-card { background: #131a2e; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; }
        .op-card-flame { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.4); border-radius: 16px; }
        .op-card-leaf { background: rgba(34,197,94,0.10); border: 1px solid rgba(34,197,94,0.40); border-radius: 16px; }
        .op-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #f59e0b; }
        .op-mist { color: #94a3b8; }
        .op-flame { color: #f59e0b; }
        .op-cream { color: #f5ecd9; }
        .op-leaf { color: #22c55e; }
        .op-tab { display: block; width: 100%; text-align: center; padding: 6px 8px; border-radius: 6px; font-size: 11px; color: #94a3b8; background: transparent; border: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .op-tab:hover { color: #f5ecd9; background: rgba(255,255,255,0.05); }
        .op-tab[aria-current='page'] { background: rgba(245,158,11,0.15); color: #f59e0b; font-weight: 600; }
        .op-chip { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; font-size: 11px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #f5ecd9; }
        .op-chip-flame { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.4); color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em; }
        .op-chip-leaf { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: rgba(34,197,94,0.10); border: 1px solid rgba(34,197,94,0.40); color: #22c55e; }
        .op-note { background: rgba(124,58,237,0.10); border: 1px solid rgba(124,58,237,0.30); color: rgba(196,181,253,0.9); border-radius: 12px; padding: 12px; font-size: 12px; font-style: italic; line-height: 1.5; }
        .op-empty { background: rgba(19,26,46,0.4); border: 1px dashed rgba(255,255,255,0.10); border-radius: 16px; padding: 24px; text-align: center; font-size: 14px; color: #94a3b8; }
      `}</style>

      <div className="op-banner sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <p className="text-xs sm:text-sm font-semibold tracking-wide">
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 mr-2">
            Preview mode
          </span>
          This is what your guests see
        </p>
        <Link href="/owner/dashboard" className="op-banner-btn">
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
            <p className="font-display font-extrabold text-cream text-lg leading-tight">
              {campground.name}
            </p>
          </div>
        </header>

        {/* Tab nav — same structure as the guest (app) AppNav. Uses the
            scoped .op-tabs-grid + .op-tab classes (defined in the <style>
            block above) so the row-of-pills layout renders reliably even
            if Tailwind's grid-cols-4 utility doesn't resolve. */}
        <nav>
          <ul className="op-tabs-grid grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={
                      active
                        ? 'op-tab block w-full text-center rounded-md bg-flame/15 text-flame px-2 py-1.5 font-semibold'
                        : 'op-tab block w-full text-center rounded-md text-mist px-2 py-1.5 hover:text-cream hover:bg-white/5 transition-colors'
                    }
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

        {/* Single page-level preview note. Sits at the bottom so it doesn't
            interrupt the simulated guest content above. */}
        <PreviewNote>
          You&apos;re viewing your campground exactly as a checked-in guest
          would. Real bulletins and meetups are pulled live; the empty tabs
          show what guests see before activity exists.
        </PreviewNote>
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab content
// ---------------------------------------------------------------------------

// Example data shown when the owner hasn't filled in their profile yet, so
// they can see what the card would look like fully populated.
const EXAMPLE_CAMPGROUND = {
  address: '123 Campground Rd, Asheville, NC 28801',
  phone: '(828) 555-0142',
  website: 'www.avaloncampground.com',
  amenities: ['full_hookups', 'wifi', 'dog_friendly', 'pool'],
}

function HomeTab({
  campground,
  bulletin,
}: {
  campground: Props['campground']
  bulletin: Props['bulletin']
}) {
  const realAmenities = campground.amenities
    .map((a) => AMENITY_LABEL[a] ?? a)
    .filter(Boolean)
  const realAddress = campground.address?.trim() || null
  const realPhone = campground.phone?.trim() || null
  const realWebsite = normalizeUrl(campground.website)

  // If literally every field is empty, fall back to the example data so the
  // owner can see what a populated card looks like.
  const allEmpty =
    !realAddress &&
    !realPhone &&
    !realWebsite &&
    realAmenities.length === 0
  const showExample = allEmpty

  const address = showExample ? EXAMPLE_CAMPGROUND.address : realAddress
  const phone = showExample ? EXAMPLE_CAMPGROUND.phone : realPhone
  const website = showExample
    ? normalizeUrl(EXAMPLE_CAMPGROUND.website)
    : realWebsite
  const amenityLabels = showExample
    ? EXAMPLE_CAMPGROUND.amenities.map((a) => AMENITY_LABEL[a] ?? a)
    : realAmenities

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

      {/* Big logo at the top of Home — what a guest sees first after scan. */}
      <div className="flex flex-col items-center text-center">
        {campground.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded
          <img
            src={campground.logoUrl}
            alt={`${campground.name} logo`}
            className="h-20 w-20 rounded-2xl border border-white/10 bg-card object-cover shadow-lg shadow-black/30"
          />
        ) : (
          <div className="h-20 w-20 rounded-2xl border border-dashed border-white/15 bg-card grid place-items-center text-4xl shadow-lg shadow-black/30">
            🏕️
          </div>
        )}
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-2.5 py-1 text-[11px] font-semibold text-leaf">
          <span aria-hidden>✓</span>
          Checked in
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-cream leading-tight">
          Welcome to {campground.name}
        </h1>
        <p className="mt-1.5 font-serif italic text-flame text-sm leading-snug max-w-md">
          You&apos;re checked in for 24 hours. See who&apos;s open to a friendly
          wave today.
        </p>
      </div>

      {/* Single campground info card. Shows address + phone + website +
          amenity chips. Falls back to example data when nothing is set,
          with a note pointing the owner at /owner/profile. */}
      <section className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
          About this campground
        </p>

        {(address || phone || website) && (
          <ul className="space-y-1.5">
            {address && (
              <li className="flex items-start gap-2 text-sm text-cream">
                <span aria-hidden className="text-mist">📍</span>
                <span>{address}</span>
              </li>
            )}
            {phone && (
              <li className="flex items-start gap-2 text-sm text-cream">
                <span aria-hidden className="text-mist">📞</span>
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className="hover:text-flame underline-offset-2 hover:underline"
                >
                  {phone}
                </a>
              </li>
            )}
            {website && (
              <li className="flex items-start gap-2 text-sm">
                <span aria-hidden className="text-mist">🔗</span>
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-flame underline-offset-2 hover:underline break-all"
                >
                  {prettyUrl(website)}
                </a>
              </li>
            )}
          </ul>
        )}

        {amenityLabels.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-mist font-semibold">
              Amenities
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
          </div>
        )}

        {showExample && (
          <p className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-2 text-[11px] text-purple-200/90 italic leading-snug">
            Add your real info in <a
              href="/owner/profile"
              className="text-purple-100 font-semibold underline-offset-2 hover:underline"
            >Profile</a> to replace this example.
          </p>
        )}
      </section>
    </div>
  )
}

function normalizeUrl(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    // If it doesn't already include a scheme, default to https://.
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const u = new URL(withScheme)
    return u.toString()
  } catch {
    return null
  }
}

function prettyUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return u.host + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return raw
  }
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

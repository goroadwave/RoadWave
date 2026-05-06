import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Read-only campground updates view. The "Just See Campground Updates"
// button on /campground/<slug> lands here. No account required, no
// check-in required. We fetch the campground's active bulletins and
// upcoming meetups via the service-role admin client (RLS on those
// tables ordinarily limits reads to checked-in users) and render a
// sanitized subset — message body, category, posted timestamp, meetup
// title, time, location, description. No camper names, no internal IDs.

export const dynamic = 'force-dynamic'

type Params = { slug: string }

type CampgroundRow = {
  id: string
  slug: string
  name: string
  city: string | null
  region: string | null
  logo_url: string | null
  is_active: boolean
}

type BulletinRow = {
  id: string
  message: string
  category: 'event' | 'special' | 'alert' | 'general'
  expires_at: string | null
  created_at: string
}

type MeetupRow = {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('campgrounds')
    .select('name')
    .eq('slug', slug)
    .maybeSingle<{ name: string }>()
  if (!data) {
    return {
      title: 'Campground not on RoadWave yet',
      robots: { index: false, follow: false },
    }
  }
  return {
    title: `${data.name} updates · RoadWave`,
    description: `Latest bulletins and upcoming meetups at ${data.name}.`,
  }
}

export default async function CampgroundUpdatesPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const admin = createSupabaseAdminClient()

  const { data: campground } = await admin
    .from('campgrounds')
    .select('id, slug, name, city, region, logo_url, is_active')
    .eq('slug', slug)
    .maybeSingle<CampgroundRow>()

  if (!campground || !campground.is_active) notFound()

  // Active bulletins: not expired (expires_at is null OR in the future).
  // Most recent first. Capped at 30 so a campground with a long history
  // doesn't make this page enormous.
  const nowIso = new Date().toISOString()
  const [{ data: bulletins }, { data: meetups }] = await Promise.all([
    admin
      .from('bulletins')
      .select('id, message, category, expires_at, created_at')
      .eq('campground_id', campground.id)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(30)
      .returns<BulletinRow[]>(),
    admin
      .from('meetups')
      .select('id, title, description, location, start_at, end_at')
      .eq('campground_id', campground.id)
      .gte('start_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(30)
      .returns<MeetupRow[]>(),
  ])

  const where = [campground.city, campground.region]
    .filter(Boolean)
    .join(', ')

  return (
    <main className="min-h-screen bg-night text-cream">
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href={`/campground/${campground.slug}`}
          className="text-xs font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Back
        </Link>
      </header>

      <article className="px-4 pb-16 sm:pb-24">
        <div className="mx-auto max-w-xl space-y-10">
          {/* Campground header — same brand pieces as the welcome page */}
          <section className="text-center space-y-4 pt-4 sm:pt-8">
            {campground.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- partner logos are remote, dimensions vary
              <img
                src={campground.logo_url}
                alt={`${campground.name} logo`}
                className="mx-auto h-16 w-auto rounded-2xl border border-white/10 bg-card p-2.5 object-contain"
              />
            ) : (
              <div className="mx-auto h-16 w-16 rounded-2xl border border-flame/30 bg-flame/[0.06] grid place-items-center">
                <span className="font-display text-xl font-extrabold text-flame">
                  {campground.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                Updates from
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-[1.1]">
                {campground.name}
              </h1>
              {where && <p className="text-sm text-mist">{where}</p>}
            </div>
            <p className="text-[11px] text-mist/80 leading-snug max-w-sm mx-auto">
              Read-only view. No account required. Check in to wave at other
              campers, post messages, or RSVP.
            </p>
          </section>

          {/* Bulletins */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              Campground announcements
            </h2>
            {bulletins && bulletins.length > 0 ? (
              <ul className="space-y-3">
                {bulletins.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${categoryColor(b.category)}`}
                      >
                        {categoryLabel(b.category)}
                      </span>
                      <span className="text-[11px] text-mist/70">
                        {formatPostedAt(b.created_at)}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-cream leading-relaxed whitespace-pre-wrap">
                      {b.message}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-5 text-center text-sm text-mist">
                No active announcements right now. Check back later.
              </p>
            )}
          </section>

          {/* Meetups */}
          <section className="space-y-3">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
              Upcoming meetups
            </h2>
            {meetups && meetups.length > 0 ? (
              <ul className="space-y-3">
                {meetups.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-2"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
                      {formatMeetupTime(m.start_at, m.end_at)}
                    </p>
                    <h3 className="font-display text-lg font-extrabold text-cream leading-tight">
                      {m.title}
                    </h3>
                    {m.location && (
                      <p className="text-sm text-mist">
                        <span aria-hidden>📍 </span>
                        {m.location}
                      </p>
                    )}
                    {m.description && (
                      <p className="text-sm text-cream/90 leading-relaxed whitespace-pre-wrap">
                        {m.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-5 text-center text-sm text-mist">
                No meetups scheduled right now.
              </p>
            )}
          </section>

          {/* Closing nudge — opt back into the full app */}
          <section className="text-center space-y-3 pt-2">
            <p className="text-sm text-cream/90 leading-relaxed">
              Want to wave at other campers, RSVP to meetups, or get
              reminders? Check in to {campground.name}.
            </p>
            <Link
              href={`/campground/${campground.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              Check In to This Campground <span aria-hidden>👋</span>
            </Link>
          </section>
        </div>
      </article>
    </main>
  )
}

function categoryLabel(c: BulletinRow['category']): string {
  switch (c) {
    case 'event':
      return 'Event'
    case 'special':
      return 'Special'
    case 'alert':
      return 'Alert'
    case 'general':
    default:
      return 'Update'
  }
}

function categoryColor(c: BulletinRow['category']): string {
  // Alert lights up red so storm/weather notices stand out at a glance;
  // everything else uses the brand amber.
  return c === 'alert' ? 'text-red-300' : 'text-flame'
}

// Posted timestamp in a relative form when fresh, absolute when older.
function formatPostedAt(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// Meetup time: "Today, 7:00 PM" / "Tomorrow, 8:00 AM" / "Sat Jul 12, 6:30 PM"
// — with optional end time appended.
function formatMeetupTime(startIso: string, endIso: string | null): string {
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return ''

  const today = new Date()
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  let dayPart: string
  if (isSameDay(start, today)) dayPart = 'Today'
  else if (isSameDay(start, tomorrow)) dayPart = 'Tomorrow'
  else
    dayPart = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  }
  const startTime = start.toLocaleTimeString(undefined, timeOpts)

  if (!endIso) return `${dayPart}, ${startTime}`

  const end = new Date(endIso)
  if (Number.isNaN(end.getTime())) return `${dayPart}, ${startTime}`

  const endTime = end.toLocaleTimeString(undefined, timeOpts)
  return `${dayPart}, ${startTime} – ${endTime}`
}

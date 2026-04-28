import Link from 'next/link'
import { format, isSameDay } from 'date-fns'
import { MeetupForm } from '@/components/meetups/meetup-form'
import { DeleteMeetupForm } from '@/components/meetups/delete-meetup-form'
import { PageHeading } from '@/components/ui/page-heading'
import { Eyebrow } from '@/components/ui/eyebrow'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function formatMeetupTime(start: Date, end: Date | null) {
  const startStr = format(start, 'EEE, MMM d · h:mm a')
  if (!end) return startStr
  if (isSameDay(start, end)) return `${startStr} – ${format(end, 'h:mm a')}`
  return `${startStr} – ${format(end, 'EEE, MMM d · h:mm a')}`
}

export default async function MeetupsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: latestCheckIn } = await supabase
    .from('check_ins')
    .select('campground_id, expires_at')
    .eq('profile_id', user!.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestCheckIn) {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Meetup spots"
          title="Check in to see what's on"
          subtitle="Coffee, fires, music. Show up if you want."
        />
        <Link
          href="/checkin"
          className="inline-flex items-center gap-2 rounded-lg bg-flame px-4 py-2 text-sm font-semibold text-night shadow-lg shadow-flame/10 hover:bg-amber-400"
        >
          Check in
          <span aria-hidden>👋</span>
        </Link>
      </div>
    )
  }

  const campgroundId = latestCheckIn.campground_id

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, name, city, region')
    .eq('id', campgroundId)
    .single()

  const { data: adminRow } = await supabase
    .from('campground_admins')
    .select('role')
    .eq('campground_id', campgroundId)
    .eq('user_id', user!.id)
    .maybeSingle()
  const isAdmin = !!adminRow

  const { data: meetups } = await supabase
    .from('meetups')
    .select('id, title, description, location, start_at, end_at, posted_by, created_at')
    .eq('campground_id', campgroundId)
    .order('start_at', { ascending: true })

  // Determine which meetups were posted by a campground host vs a regular
  // camper, so we can render the same hosted-vs-community split as the
  // demo. The set of admin user_ids for this campground answers the
  // question; everything outside that set is camper-posted.
  const { data: adminRows } = await supabase
    .from('campground_admins')
    .select('user_id')
    .eq('campground_id', campgroundId)
  const adminIds = new Set((adminRows ?? []).map((r) => r.user_id))

  // We also need the @username of camper-posted meetups for the
  // "@handle posted: …" format. Pull only the posters who are NOT admins.
  const camperPosterIds = Array.from(
    new Set(
      (meetups ?? [])
        .map((m) => m.posted_by)
        .filter((id): id is string => Boolean(id) && !adminIds.has(id)),
    ),
  )
  let usernameByPosterId = new Map<string, string>()
  if (camperPosterIds.length > 0) {
    const { data: posterProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', camperPosterIds)
    usernameByPosterId = new Map(
      (posterProfiles ?? []).map((p) => [p.id, p.username]),
    )
  }

  // eslint-disable-next-line react-hooks/purity -- server component, request-scoped now
  const now = Date.now()
  const upcoming = (meetups ?? []).filter((m) => new Date(m.start_at).getTime() >= now)
  const past = (meetups ?? []).filter((m) => new Date(m.start_at).getTime() < now)

  const hostedUpcoming = upcoming.filter((m) => adminIds.has(m.posted_by))
  const camperUpcoming = upcoming.filter((m) => !adminIds.has(m.posted_by))

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Meetups"
        title="What's happening"
        subtitle="From the campground and from neighbors. Show up if you want."
      />

      {isAdmin && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Eyebrow>Post a meetup</Eyebrow>
            <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-flame">
              Host
            </span>
          </div>
          <MeetupForm campgroundId={campgroundId} />
        </section>
      )}

      <section className="space-y-2">
        <SectionLabel verified>
          Hosted by {campground?.name ?? 'your campground'}
        </SectionLabel>
        {hostedUpcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-flame/30 bg-flame/[0.04] p-5 text-center text-sm text-mist">
            Your campground hasn&apos;t posted anything yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {hostedUpcoming.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-flame/40 bg-flame/[0.04] p-4 shadow-lg shadow-black/20"
              >
                <HostedMeetupRow meetup={m} canDelete={isAdmin} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <SectionLabel>Posted by campers</SectionLabel>
        {camperUpcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-5 text-center text-sm text-mist">
            No camper posts yet. Be the first.
          </p>
        ) : (
          <ul className="space-y-2">
            {camperUpcoming.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20"
              >
                <CamperMeetupRow
                  meetup={m}
                  username={usernameByPosterId.get(m.posted_by ?? '') ?? null}
                  canDelete={isAdmin || m.posted_by === user!.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <PostYourOwnMeetup canPost={isAdmin} />

      {past.length > 0 && (
        <section className="space-y-3">
          <Eyebrow>Past</Eyebrow>
          <ul className="space-y-2">
            {past.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-white/5 bg-card/50 p-4 opacity-70"
              >
                <HostedMeetupRow meetup={m} canDelete={isAdmin} />
              </li>
            ))}
          </ul>
        </section>
      )}
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
          title="Verified campground"
          className="grid h-3 w-3 shrink-0 place-items-center rounded-full bg-flame text-night text-[8px] font-bold leading-none"
        >
          ✓
        </span>
      )}
    </div>
  )
}

function PostYourOwnMeetup({ canPost }: { canPost: boolean }) {
  if (canPost) {
    // Admins already have the post form at the top of the page; this CTA
    // would be redundant for them.
    return null
  }
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center space-y-1.5">
      <p className="text-base font-semibold text-cream">＋ Post Your Own Meetup</p>
      <p className="text-xs text-mist leading-snug">
        Camper-posted meetups are coming soon. For now, your campground hosts the
        list — ask them to add yours.
      </p>
    </div>
  )
}

function HostedMeetupRow({
  meetup,
  canDelete,
}: {
  meetup: {
    id: string
    title: string
    description: string | null
    location: string | null
    start_at: string
    end_at: string | null
  }
  canDelete: boolean
}) {
  const start = new Date(meetup.start_at)
  const end = meetup.end_at ? new Date(meetup.end_at) : null
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 font-semibold text-cream leading-tight">
            {meetup.title}
          </h3>
          <span
            aria-label="Posted by the campground"
            title="Posted by the campground"
            className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-flame text-night text-[10px] font-bold leading-none"
          >
            ✓
          </span>
        </div>
        <p className="mt-0.5 text-xs text-mist">{formatMeetupTime(start, end)}</p>
        {meetup.location && (
          <span className="mt-2 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2.5 py-0.5 text-xs text-flame">
            {meetup.location}
          </span>
        )}
        {meetup.description && (
          <p className="mt-2 text-sm text-cream/90 whitespace-pre-line">
            {meetup.description}
          </p>
        )}
      </div>
      {canDelete && <DeleteMeetupForm meetupId={meetup.id} />}
    </div>
  )
}

function CamperMeetupRow({
  meetup,
  username,
  canDelete,
}: {
  meetup: {
    id: string
    title: string
    description: string | null
    location: string | null
    start_at: string
    end_at: string | null
  }
  username: string | null
  canDelete: boolean
}) {
  const start = new Date(meetup.start_at)
  const end = meetup.end_at ? new Date(meetup.end_at) : null
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        {username && (
          <p className="text-xs font-semibold text-flame">@{username}</p>
        )}
        <h3 className="mt-1 text-sm font-semibold text-cream leading-tight">
          {meetup.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-mist">{formatMeetupTime(start, end)}</p>
        {meetup.location && (
          <span className="mt-1.5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cream">
            {meetup.location}
          </span>
        )}
        {meetup.description && (
          <p className="mt-2 text-xs text-cream/90 leading-snug whitespace-pre-line">
            {meetup.description}
          </p>
        )}
      </div>
      {canDelete && <DeleteMeetupForm meetupId={meetup.id} />}
    </div>
  )
}


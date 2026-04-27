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

  // eslint-disable-next-line react-hooks/purity -- server component, request-scoped now
  const now = Date.now()
  const upcoming = (meetups ?? []).filter((m) => new Date(m.start_at).getTime() >= now)
  const past = (meetups ?? []).filter((m) => new Date(m.start_at).getTime() < now)

  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow={campground ? `${campground.name} hosts` : 'Your campground hosts'}
        title="Meetup spots"
        subtitle="Coffee, fires, music. Show up if you want."
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

      <section className="space-y-3">
        <Eyebrow>Coming up</Eyebrow>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
            Nothing on the calendar yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20"
              >
                <MeetupRow meetup={m} canDelete={isAdmin} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <Eyebrow>Past</Eyebrow>
          <ul className="space-y-2">
            {past.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-white/5 bg-card/50 p-4 opacity-70"
              >
                <MeetupRow meetup={m} canDelete={isAdmin} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function MeetupRow({
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
        <h3 className="font-semibold text-cream leading-tight">{meetup.title}</h3>
        <p className="mt-0.5 text-xs text-mist">{formatMeetupTime(start, end)}</p>
        {meetup.location && (
          <span className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-cream">
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

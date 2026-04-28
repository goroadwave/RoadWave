import { format } from 'date-fns'
import { DeleteMeetupForm } from '@/components/meetups/delete-meetup-form'
import { MeetupForm } from '@/components/meetups/meetup-form'
import { Eyebrow } from '@/components/ui/eyebrow'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadOwnerCampground } from '../_helpers'

export default async function OwnerMeetupsPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <PageHeading
        eyebrow="Meetups"
        title="No campground linked"
        subtitle="Refresh, or contact support if this persists."
      />
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: meetups } = await supabase
    .from('meetups')
    .select('id, title, description, location, start_at, end_at')
    .eq('campground_id', campground.id)
    .order('start_at', { ascending: true })

  // eslint-disable-next-line react-hooks/purity -- server component, request-scoped now
  const now = Date.now()
  const upcoming = (meetups ?? []).filter(
    (m) => new Date(m.start_at).getTime() >= now,
  )

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Meetups"
        title="Hosted events for guests"
        subtitle="Past meetups archive automatically once they've ended."
      />

      <section className="space-y-2">
        <Eyebrow>Post a new meetup</Eyebrow>
        <MeetupForm campgroundId={campground.id} />
      </section>

      <section className="space-y-2">
        <Eyebrow>Upcoming</Eyebrow>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-5 text-center text-sm text-mist">
            Nothing on the calendar yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-flame/40 bg-flame/[0.04] p-4 flex items-start gap-3"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-cream leading-tight">
                    {m.title}
                  </h3>
                  <p className="text-xs text-mist mt-0.5">
                    {format(new Date(m.start_at), 'EEE, MMM d · h:mm a')}{' '}
                    <span className="text-mist/60">({campground.timezone})</span>
                  </p>
                  {m.location && (
                    <span className="mt-1.5 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2.5 py-0.5 text-xs text-flame">
                      {m.location}
                    </span>
                  )}
                  {m.description && (
                    <p className="mt-2 text-sm text-cream/90 whitespace-pre-line">
                      {m.description}
                    </p>
                  )}
                </div>
                <DeleteMeetupForm meetupId={m.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

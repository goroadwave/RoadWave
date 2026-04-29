import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format, formatDistanceToNow, isSameDay } from 'date-fns'
import { CrossedPathConversation } from '@/components/crossed-paths/crossed-path-conversation'
import { NewConnectionBanner } from '@/components/crossed-paths/new-connection-banner'
import { ReportDialog } from '@/components/report/report-dialog'
import { TRAVEL_STYLE_LABEL } from '@/lib/constants/travel-styles'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export default async function CrossedPathDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Pull the crossed_paths row. RLS ensures the user is a participant.
  const { data: cp } = await supabase
    .from('crossed_paths')
    .select('id, profile_a_id, profile_b_id, campground_id, matched_at')
    .eq('id', id)
    .maybeSingle()
  if (!cp) notFound()

  const otherId = cp.profile_a_id === user.id ? cp.profile_b_id : cp.profile_a_id

  // Other camper's profile + the campground name + the message thread,
  // all in parallel.
  const [{ data: other }, { data: campground }, { data: messages }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name, travel_style, share_travel_style')
        .eq('id', otherId)
        .maybeSingle(),
      cp.campground_id
        ? supabase
            .from('campgrounds')
            .select('name')
            .eq('id', cp.campground_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('crossed_paths_messages')
        .select('id, sender_id, body, created_at')
        .eq('crossed_path_id', id)
        .order('created_at', { ascending: true }),
    ])

  if (!other) notFound()

  const otherName = other.display_name ?? other.username
  const styleLabel =
    other.share_travel_style && other.travel_style
      ? TRAVEL_STYLE_LABEL[other.travel_style] ?? other.travel_style
      : null
  const cgName = campground?.name ?? 'an unknown campground'
  const matchedWhen = formatDistanceToNow(new Date(cp.matched_at), {
    addSuffix: true,
  })

  // Group messages into time-clusters so we don't show a date stamp on every
  // single message — only on the first message of a day.
  const grouped = groupByDay(messages ?? [])

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-flame/30 bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href="/crossed-paths"
              className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              ← All crossed paths
            </Link>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-cream leading-tight">
              {otherName}
            </h1>
            <p className="text-xs text-mist">@{other.username}</p>
            {styleLabel && (
              <span className="mt-1 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
                {styleLabel}
              </span>
            )}
          </div>
          <span className="shrink-0 rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-flame">
            Crossed paths
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
          <p className="text-xs text-mist">
            You crossed paths at{' '}
            <span className="text-cream">{cgName}</span> · {matchedWhen}
          </p>
          <ReportDialog
            reportedUserId={otherId}
            reportedLabel={`@${other.username}`}
            campgroundId={cp.campground_id}
          >
            <button
              type="button"
              className="text-xs text-mist/70 hover:text-flame underline-offset-2 hover:underline"
            >
              Report
            </button>
          </ReportDialog>
        </div>
      </header>

      <NewConnectionBanner crossedPathId={cp.id} />

      <CrossedPathConversation
        crossedPathId={cp.id}
        currentUserId={user.id}
        groups={grouped}
      />
    </div>
  )
}

type Message = {
  id: string
  sender_id: string
  body: string
  created_at: string
}
export type DayGroup = { dayLabel: string; messages: Message[] }

function groupByDay(messages: Message[]): DayGroup[] {
  if (messages.length === 0) return []
  const groups: DayGroup[] = []
  let currentDay: Date | null = null
  for (const m of messages) {
    const d = new Date(m.created_at)
    if (!currentDay || !isSameDay(d, currentDay)) {
      groups.push({ dayLabel: format(d, 'EEE, MMM d'), messages: [m] })
      currentDay = d
    } else {
      groups[groups.length - 1]!.messages.push(m)
    }
  }
  return groups
}

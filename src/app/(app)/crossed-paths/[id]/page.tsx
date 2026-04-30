import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format, formatDistanceToNow, isSameDay } from 'date-fns'
import { CrossedPathConversation } from '@/components/crossed-paths/crossed-path-conversation'
import { ConsentPrompt } from '@/components/crossed-paths/consent-prompt'
import { NewConnectionBanner } from '@/components/crossed-paths/new-connection-banner'
import { ReportDialog } from '@/components/report/report-dialog'
import { SafetyBanner } from '@/components/ui/safety-banner'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

const SAFETY_COPY =
  'Meet smart: use public campground areas, trust your instincts, and report pressure, harassment, or suspicious behavior.'

export default async function CrossedPathDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cp } = await supabase
    .from('crossed_paths')
    .select(
      'id, profile_a_id, profile_b_id, campground_id, matched_at, status',
    )
    .eq('id', id)
    .maybeSingle()
  if (!cp) notFound()

  if (cp.status === 'declined') {
    return (
      <div className="space-y-4">
        <SafetyBanner message={SAFETY_COPY} />
        <section className="rounded-2xl border border-white/5 bg-card p-5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mist/70">
            Connection closed
          </p>
          <h1 className="font-display text-2xl font-extrabold text-cream leading-tight">
            That wave didn&apos;t become a connection.
          </h1>
          <p className="text-sm text-mist leading-relaxed">
            One of you tapped Not Yet. No notification was sent.
          </p>
          <Link
            href="/crossed-paths"
            className="mt-2 inline-flex text-xs text-flame underline-offset-2 hover:underline"
          >
            ← All crossed paths
          </Link>
        </section>
      </div>
    )
  }

  if (cp.status === 'pending_consent') {
    type ConsentSummary = {
      crossed_path_id: string
      campground_id: string | null
      rig_type: string | null
      interests: string[] | null
      status: string
    }
    const { data: summary } = await supabase
      .rpc('pending_consent_summary', { _crossed_path_id: id })
      .maybeSingle<ConsentSummary>()
    return (
      <div className="space-y-4">
        <SafetyBanner message={SAFETY_COPY} />
        <ConsentPrompt
          crossedPathId={cp.id}
          rigType={summary?.rig_type ?? null}
          interests={summary?.interests ?? []}
        />
      </div>
    )
  }

  // status === 'connected'
  const otherId =
    cp.profile_a_id === user.id ? cp.profile_b_id : cp.profile_a_id

  const [{ data: other }, { data: campground }, { data: messages }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, display_name')
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

  // First name only — split on whitespace, take the first token. Falls
  // back to username if display_name isn't set.
  const otherFirstName =
    (other.display_name && other.display_name.trim().split(/\s+/)[0]) ||
    other.username
  const cgName = campground?.name ?? 'an unknown campground'
  const matchedWhen = formatDistanceToNow(new Date(cp.matched_at), {
    addSuffix: true,
  })

  const grouped = groupByDay(messages ?? [])

  return (
    <div className="space-y-4">
      <SafetyBanner message={SAFETY_COPY} />
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
              {otherFirstName}
            </h1>
          </div>
          <span className="shrink-0 rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-flame">
            Connected
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
          <p className="text-xs text-mist">
            You crossed paths at{' '}
            <span className="text-cream">{cgName}</span> · {matchedWhen}
          </p>
          <ReportDialog
            reportedUserId={otherId}
            reportedLabel={otherFirstName}
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

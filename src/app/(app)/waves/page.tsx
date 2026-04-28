import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { RemoveWaveButton } from '@/components/waves/remove-wave-button'
import { PageHeading } from '@/components/ui/page-heading'
import { TRAVEL_STYLE_LABEL } from '@/lib/constants/travel-styles'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Lists every camper the signed-in user has waved at, with the current
// wave state (Matched / Waiting). Mirrors the demo's Waves screen so the
// real app feels alive even before chat exists. "Send a message" is
// intentionally not surfaced — DMs are not in the real app yet.
export default async function WavesPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Every wave I've sent (sorted newest first), plus my crossed_paths so
  // we can mark which sends became mutual matches.
  const [{ data: waves }, { data: matches }] = await Promise.all([
    supabase
      .from('waves')
      .select('id, to_profile_id, sent_at, campground_id')
      .eq('from_profile_id', user!.id)
      .order('sent_at', { ascending: false }),
    supabase
      .from('crossed_paths')
      .select('profile_a_id, profile_b_id'),
  ])

  if (!waves || waves.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Your waves"
          title="Waves"
          subtitle="Everyone you've waved at. Reach out when you're ready."
        />
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
          No waves yet. Head to{' '}
          <Link
            href="/nearby"
            className="text-cream font-semibold underline-offset-2 hover:underline"
          >
            Nearby
          </Link>{' '}
          and say hi to your neighbors.
        </div>
      </div>
    )
  }

  const matchedIds = new Set<string>()
  for (const m of matches ?? []) {
    const otherId = m.profile_a_id === user!.id ? m.profile_b_id : m.profile_a_id
    matchedIds.add(otherId)
  }

  const toIds = Array.from(new Set(waves.map((w) => w.to_profile_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, travel_style, share_travel_style')
    .in('id', toIds)
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Your waves"
        title="Waves"
        subtitle="Everyone you've waved at. Reach out when you're ready."
      />

      <ul className="space-y-2.5">
        {waves.map((w) => {
          const p = profileById.get(w.to_profile_id)
          if (!p) return null
          const matched = matchedIds.has(w.to_profile_id)
          const styleLabel =
            p.share_travel_style && p.travel_style
              ? TRAVEL_STYLE_LABEL[p.travel_style] ?? p.travel_style
              : null
          const when = formatDistanceToNow(new Date(w.sent_at), {
            addSuffix: true,
          })
          const name = p.display_name ?? p.username
          return (
            <li
              key={w.id}
              className="rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-cream leading-tight">
                    {name}
                  </h3>
                  <p className="text-[11px] text-mist">@{p.username}</p>
                  {styleLabel && (
                    <span className="mt-1 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
                      {styleLabel}
                    </span>
                  )}
                  <p className="mt-1 text-[10px] text-mist/70">Sent {when}</p>
                </div>
                <WaveStateBadge matched={matched} />
              </div>
              <div className="pt-1 border-t border-white/5">
                <RemoveWaveButton waveId={w.id} />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="text-center">
        <p className="text-xs text-mist/80 italic">
          Direct messages are coming soon. For now,{' '}
          <Link
            href="/crossed-paths"
            className="text-flame underline-offset-2 hover:underline"
          >
            mutual waves live in Crossed paths
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

function WaveStateBadge({ matched }: { matched: boolean }) {
  if (matched) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-flame/15 border border-flame/30 px-2 py-0.5 text-[10px] font-semibold text-flame">
        Matched <span aria-hidden>🎉</span>
      </span>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] italic text-mist">
      Waiting
    </span>
  )
}


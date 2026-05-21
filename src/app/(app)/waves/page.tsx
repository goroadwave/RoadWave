import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { INTEREST_EMOJI, INTEREST_LABEL } from '@/lib/constants/interests'
import { RemoveWaveButton } from '@/components/waves/remove-wave-button'
import { PageHeading } from '@/components/ui/page-heading'
import { SafetyBanner } from '@/components/ui/safety-banner'
import { TRAVEL_STYLE_LABEL } from '@/lib/constants/travel-styles'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// The signed-in camper's "Waves" surface. Two sections:
//
//   1. INCOMING — pending waves where the viewer is the target. Each
//      links to /waves/incoming/<id> for the full privacy-redacted
//      card + Wave Back / Ignore controls. Previously surfaced only
//      via Lantern notifications; now also discoverable from the
//      AppNav.
//
//   2. SENT — the viewer's outbound waves with their current state
//      (Waiting / You both waved). Mirrors the existing demo's Waves
//      screen.
//
// Privacy contract: incoming waves are listed with the sender's
// rig_type + interests only (no name / avatar), matching the
// /waves/incoming/<id> redacted surface and the nearby_campers RPC.
export const dynamic = 'force-dynamic'

type IncomingWaveRow = {
  id: string
  from_profile_id: string
  campground_id: string
  sent_at: string
}

type SentWaveRow = {
  id: string
  to_profile_id: string
  sent_at: string
  campground_id: string
}

export default async function WavesPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nowIso = new Date().toISOString()
  const [
    { data: incoming },
    { data: sent },
    { data: matches },
  ] = await Promise.all([
    // Pending incoming waves only -- declined / matched / connected
    // each have their own surface (Past Waves, the /crossed-paths
    // consent prompt, etc.) so showing them here would duplicate.
    supabase
      .from('waves')
      .select('id, from_profile_id, campground_id, sent_at')
      .eq('to_profile_id', user!.id)
      .eq('status', 'pending')
      .order('sent_at', { ascending: false })
      .returns<IncomingWaveRow[]>(),
    supabase
      .from('waves')
      .select('id, to_profile_id, sent_at, campground_id')
      .eq('from_profile_id', user!.id)
      .order('sent_at', { ascending: false })
      .returns<SentWaveRow[]>(),
    supabase
      .from('crossed_paths')
      .select('profile_a_id, profile_b_id'),
  ])

  const incomingList = incoming ?? []
  const sentList = sent ?? []
  const matchedIds = new Set<string>()
  for (const m of matches ?? []) {
    const otherId = m.profile_a_id === user!.id ? m.profile_b_id : m.profile_a_id
    matchedIds.add(otherId)
  }

  // Resolve sender campground for each incoming wave so the card can
  // show "at <campground name>" -- helps a camper recognize who waved
  // when multiple are pending across different stops.
  const cgIds = Array.from(
    new Set([
      ...incomingList.map((w) => w.campground_id),
      ...sentList.map((w) => w.campground_id),
    ]),
  ).filter((id): id is string => Boolean(id))
  const { data: cgRows } =
    cgIds.length > 0
      ? await supabase.from('campgrounds').select('id, name').in('id', cgIds)
      : { data: [] as { id: string; name: string }[] }
  const cgNameById = new Map<string, string>(
    (cgRows ?? []).map((c) => [c.id, c.name]),
  )

  // For the SENT list we still surface display name / travel style for
  // every target since the viewer already established mutual presence
  // by being checked in alongside them. For the INCOMING list we
  // intentionally do NOT load names -- the /waves/incoming/<id>
  // surface is the privacy-redacted view that the existing
  // incoming_wave RPC powers.
  const sentToIds = Array.from(new Set(sentList.map((w) => w.to_profile_id)))
  const { data: sentProfiles } =
    sentToIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, username, display_name, travel_style, share_travel_style')
          .in('id', sentToIds)
      : { data: [] as { id: string; username: string; display_name: string | null; travel_style: string | null; share_travel_style: boolean }[] }
  const sentProfileById = new Map((sentProfiles ?? []).map((p) => [p.id, p]))

  // Incoming-wave sender rig + interests (privacy-redacted shape).
  // We fetch each through the existing incoming_wave RPC so RLS +
  // share_* flags are enforced server-side. Limit to the active
  // pending list; deferred to a server-side helper so the UI stays
  // declarative.
  const incomingPreviews = await Promise.all(
    incomingList.map(async (w) => {
      const { data } = await supabase
        .rpc('incoming_wave', { _wave_id: w.id })
        .maybeSingle<{
          rig_type: string | null
          interests: string[] | null
        }>()
      return {
        id: w.id,
        campground: cgNameById.get(w.campground_id) ?? 'A nearby campground',
        when: formatDistanceToNow(new Date(w.sent_at), { addSuffix: true }),
        rigType: data?.rig_type ?? null,
        interests: data?.interests ?? [],
      }
    }),
  )

  void nowIso // reserved for a future "wave expired after X hours" cutoff

  return (
    <div className="space-y-6">
      <SafetyBanner message="A wave is only an introduction. Do not share your exact site number unless you choose to. Meet in public areas first." />
      <PageHeading
        eyebrow="Your waves"
        title="Waves"
        subtitle="Incoming first, your sent waves below."
      />

      {/* Incoming */}
      <section className="space-y-3" aria-labelledby="incoming-heading">
        <h2
          id="incoming-heading"
          className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold"
        >
          Incoming waves
        </h2>
        {incomingList.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-4 text-center text-sm text-mist">
            No incoming waves right now. When somebody waves at you, it&apos;ll
            show up here and in your Lantern.
          </p>
        ) : (
          <ul className="space-y-2.5" data-testid="incoming-waves-list">
            {incomingPreviews.map((wave) => (
              <li key={wave.id}>
                <Link
                  href={`/waves/incoming/${wave.id}`}
                  className="block rounded-2xl border border-flame/30 bg-card p-4 shadow-lg shadow-black/20 hover:border-flame/60 hover:bg-flame/[0.04] transition-colors"
                  data-testid="incoming-wave-card-link"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-flame">
                        Wave received
                      </p>
                      <h3 className="mt-0.5 font-semibold text-cream leading-tight">
                        A nearby camper waved at you
                      </h3>
                      <p className="mt-0.5 text-xs text-mist">
                        At {wave.campground} · {wave.when}
                      </p>
                    </div>
                    <span className="shrink-0 text-flame text-lg" aria-hidden>
                      👋
                    </span>
                  </div>

                  {wave.rigType && (
                    <p className="mt-3 text-sm text-cream">
                      <span className="text-mist">Rig · </span>
                      <span className="font-semibold">{wave.rigType}</span>
                    </p>
                  )}
                  {wave.interests.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {wave.interests.map((slug) => (
                        <li
                          key={slug}
                          className="inline-flex items-center gap-1 rounded-full border border-flame/30 bg-flame/10 px-2.5 py-0.5 text-xs text-cream"
                        >
                          <span aria-hidden>{INTEREST_EMOJI[slug] ?? ''}</span>
                          {INTEREST_LABEL[slug] ?? slug}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-flame">
                    Open to Wave Back <span aria-hidden>→</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sent */}
      <section className="space-y-3" aria-labelledby="sent-heading">
        <h2
          id="sent-heading"
          className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold"
        >
          Sent waves
        </h2>
        {sentList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-4 text-center text-sm text-mist">
            No waves sent yet. Head to{' '}
            <Link
              href="/nearby"
              className="text-cream font-semibold underline-offset-2 hover:underline"
            >
              Camper Connections
            </Link>{' '}
            and say hi to a camper who shares your interests.
          </div>
        ) : (
          <ul className="space-y-2.5" data-testid="sent-waves-list">
            {sentList.map((w) => {
              const p = sentProfileById.get(w.to_profile_id)
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
                      <p className="mt-1 text-[10px] text-mist/70">
                        Sent {when}
                      </p>
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
        )}
      </section>

      <div className="text-center">
        <p className="text-xs text-mist/80 italic">
          Mutual waves unlock the{' '}
          <Link
            href="/crossed-paths"
            className="text-flame underline-offset-2 hover:underline"
          >
            Past Waves
          </Link>{' '}
          archive — the people you&apos;ve crossed paths with across every
          campground.
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
      Wave sent · waiting
    </span>
  )
}

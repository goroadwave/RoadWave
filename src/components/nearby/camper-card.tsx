'use client'

import { INTEREST_EMOJI, INTEREST_LABEL } from '@/lib/constants/interests'
import type { NearbyCamper } from '@/lib/types/db'
import { WaveButton, type WaveState } from '@/components/waves/wave-button'

type Props = {
  camper: NearbyCamper
  campgroundId: string
  waveState: WaveState
  // Viewer's own interest slugs — used to compute the shared overlap
  // surfaced on the card. Names are deliberately not part of this view.
  viewerInterests: string[]
  /** crossed_paths.id when the viewer and this camper are on a mutual
   *  row. Drives the "Say Hi →" deep-link the WaveButton renders for
   *  matched + connected states. Null otherwise. */
  crossedPathId?: string | null
  /** Pre-flight eligibility reason from
   *  computeWaveEligibilityBatch. "ok" unlocks the active Send a Wave
   *  button. Anything else hands the WaveButton an `initialReason` so
   *  it renders the disabled state -- no active button that fails on
   *  click. */
  waveEligibility?: string
}

export function CamperCard({
  camper,
  campgroundId,
  waveState,
  viewerInterests,
  crossedPathId = null,
  waveEligibility = 'ok',
}: Props) {
  const viewerSet = new Set(viewerInterests)
  const shared = (camper.interests ?? []).filter((slug) => viewerSet.has(slug))

  // Identity (Camper Connections v3): show display_name (preferred)
  // or @username (fallback), or "Camper nearby" when neither is
  // available. The current viewer's own card is filtered out
  // server-side (defense-in-depth in the hub-page enrichment), so a
  // card render here is always SOMEONE else.
  const displayName = camper.display_name?.trim() || null
  const username = camper.username?.trim() || null
  const identity = displayName ?? (username ? `@${username}` : 'Camper nearby')
  const showUsernameLine = !!displayName && !!username

  return (
    <article
      className="flex h-full flex-col gap-3 rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20"
      data-testid="camper-card"
      data-target-id={camper.profile_id}
      data-wave-eligibility={waveEligibility}
    >
      <header className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mist/70">
          Camper here
        </p>
        <h3 className="font-display text-lg font-extrabold text-cream leading-tight">
          {identity}
        </h3>
        {showUsernameLine && (
          <p className="text-[11px] text-mist">@{username}</p>
        )}
        {camper.rig_type && (
          <p className="text-xs text-mist">
            Rig · <span className="text-cream font-semibold">{camper.rig_type}</span>
          </p>
        )}
      </header>

      {shared.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-flame/80">
            Shared interests
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {shared.map((slug) => (
              <li
                key={slug}
                className="inline-flex items-center gap-1 rounded-full border border-flame/30 bg-flame/10 px-2.5 py-0.5 text-xs text-cream"
              >
                <span aria-hidden>{INTEREST_EMOJI[slug] ?? ''}</span>
                {INTEREST_LABEL[slug] ?? slug}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-mist">No shared interests yet.</p>
      )}

      <div className="mt-auto pt-2 border-t border-white/5 space-y-1.5">
        <WaveButton
          targetId={camper.profile_id}
          campgroundId={campgroundId}
          initialState={waveState}
          crossedPathId={crossedPathId}
          initialEligibility={waveEligibility}
        />
        <p className="text-[11px] text-mist/70 leading-snug">
          Suggest meeting in a public campground area.
        </p>
      </div>
    </article>
  )
}

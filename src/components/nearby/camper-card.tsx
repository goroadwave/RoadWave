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
}

export function CamperCard({
  camper,
  campgroundId,
  waveState,
  viewerInterests,
}: Props) {
  const viewerSet = new Set(viewerInterests)
  const shared = (camper.interests ?? []).filter((slug) => viewerSet.has(slug))

  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mist/70">
          A nearby camper
        </p>
        {camper.rig_type && (
          <p className="text-sm text-cream">
            <span className="text-mist">Rig · </span>
            <span className="font-semibold">{camper.rig_type}</span>
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
        />
        <p className="text-[11px] text-mist/70 leading-snug">
          Suggest meeting in a public campground area.
        </p>
      </div>
    </article>
  )
}

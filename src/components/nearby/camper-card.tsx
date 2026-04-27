'use client'

import { INTEREST_EMOJI, INTEREST_LABEL } from '@/lib/constants/interests'
import type { NearbyCamper } from '@/lib/types/db'
import { WaveButton, type WaveState } from '@/components/waves/wave-button'

type Props = {
  camper: NearbyCamper
  campgroundId: string
  waveState: WaveState
}

export function CamperCard({ camper, campgroundId, waveState }: Props) {
  const name = camper.display_name ?? camper.username

  const pills: { label: string; value: string }[] = []
  if (camper.rig_type) pills.push({ label: 'Rig', value: camper.rig_type })
  if (camper.hometown) pills.push({ label: 'From', value: camper.hometown })
  if (camper.miles_driven != null)
    pills.push({ label: 'Miles', value: camper.miles_driven.toLocaleString() })
  if (camper.years_rving != null)
    pills.push({ label: 'Years', value: camper.years_rving.toString() })
  if (camper.has_pets && camper.pet_info)
    pills.push({ label: 'Pets', value: camper.pet_info })

  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-white/5 bg-card p-4 shadow-lg shadow-black/20">
      <header>
        <h3 className="font-semibold text-cream leading-tight">{name}</h3>
        <p className="text-xs text-mist">@{camper.username}</p>
        {camper.status_tag && (
          <p className="mt-2 font-serif italic text-flame text-base sm:text-lg leading-snug">
            &ldquo;{camper.status_tag}&rdquo;
          </p>
        )}
      </header>

      {camper.personal_note && (
        <p className="text-sm text-cream/90">{camper.personal_note}</p>
      )}

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pills.map((p) => (
            <span
              key={p.label}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs"
            >
              <span className="text-mist mr-1">{p.label}</span>
              <span className="text-cream">{p.value}</span>
            </span>
          ))}
        </div>
      )}

      {camper.interests && camper.interests.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {camper.interests.map((slug) => (
            <li
              key={slug}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-cream"
            >
              <span aria-hidden>{INTEREST_EMOJI[slug] ?? ''}</span>
              {INTEREST_LABEL[slug] ?? slug}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-2 border-t border-white/5">
        <WaveButton
          targetId={camper.profile_id}
          campgroundId={campgroundId}
          initialState={waveState}
        />
      </div>
    </article>
  )
}

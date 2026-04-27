'use client'

import { useMemo, useState } from 'react'
import { CamperCard } from './camper-card'
import { INTERESTS } from '@/lib/constants/interests'
import type { NearbyCamper } from '@/lib/types/db'
import type { WaveState } from '@/components/waves/wave-button'
import { Eyebrow } from '@/components/ui/eyebrow'

type Props = {
  campers: NearbyCamper[]
  campgroundId: string
  waveStateByProfileId: Record<string, WaveState>
}

export function NearbyList({ campers, campgroundId, waveStateByProfileId }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    if (selected.size === 0) return campers
    return campers.filter((c) => {
      if (!c.interests || c.interests.length === 0) return false
      for (const slug of selected) if (c.interests.includes(slug)) return true
      return false
    })
  }, [campers, selected])

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Eyebrow>Filter by interest</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const active = selected.has(i.slug)
            return (
              <button
                key={i.slug}
                type="button"
                onClick={() => toggle(i.slug)}
                className={
                  active
                    ? 'inline-flex items-center gap-1.5 rounded-full bg-flame px-3 py-1.5 text-sm font-semibold text-night shadow-md shadow-flame/20'
                    : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-cream hover:border-flame/40'
                }
              >
                <span aria-hidden>{i.emoji}</span>
                {i.label}
              </button>
            )
          })}
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full text-sm text-mist underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
          {campers.length === 0
            ? "Nobody else is checked in here right now. Come back later — or wave next time."
            : 'No campers match those interests.'}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.profile_id}>
              <CamperCard
                camper={c}
                campgroundId={campgroundId}
                waveState={waveStateByProfileId[c.profile_id] ?? 'none'}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

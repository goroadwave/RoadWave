'use client'

import { useMemo, useState } from 'react'
import { CamperCard } from './camper-card'
import { INTERESTS } from '@/lib/constants/interests'
import { TRAVEL_STYLES } from '@/lib/constants/travel-styles'
import type { NearbyCamper } from '@/lib/types/db'
import type { WaveState } from '@/components/waves/wave-button'
import { Eyebrow } from '@/components/ui/eyebrow'

type Props = {
  campers: NearbyCamper[]
  campgroundId: string
  waveStateByProfileId: Record<string, WaveState>
}

export function NearbyList({ campers, campgroundId, waveStateByProfileId }: Props) {
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set())
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return campers.filter((c) => {
      if (selectedInterests.size > 0) {
        if (!c.interests || c.interests.length === 0) return false
        let any = false
        for (const slug of selectedInterests) {
          if (c.interests.includes(slug)) {
            any = true
            break
          }
        }
        if (!any) return false
      }
      if (selectedStyles.size > 0) {
        if (!c.travel_style) return false
        if (!selectedStyles.has(c.travel_style)) return false
      }
      return true
    })
  }, [campers, selectedInterests, selectedStyles])

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function toggleStyle(slug: string) {
    setSelectedStyles((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const anyFilter = selectedInterests.size > 0 || selectedStyles.size > 0

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Eyebrow>Filter by interest</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const active = selectedInterests.has(i.slug)
            return (
              <button
                key={i.slug}
                type="button"
                onClick={() => toggleInterest(i.slug)}
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
        </div>
      </div>

      <div className="space-y-2">
        <Eyebrow>Filter by travel style</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLES.map((t) => {
            const active = selectedStyles.has(t.slug)
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => toggleStyle(t.slug)}
                className={
                  active
                    ? 'rounded-full bg-flame px-3 py-1.5 text-sm font-semibold text-night shadow-md shadow-flame/20'
                    : 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-cream hover:border-flame/40'
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {anyFilter && (
        <button
          type="button"
          onClick={() => {
            setSelectedInterests(new Set())
            setSelectedStyles(new Set())
          }}
          className="text-sm text-mist underline-offset-2 hover:underline"
        >
          Clear all filters
        </button>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
          {campers.length === 0
            ? "Nobody else is checked in here right now. Come back later — or wave next time."
            : 'No campers match those filters.'}
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

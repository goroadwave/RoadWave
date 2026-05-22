'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CamperCard } from './camper-card'
import { saveNearbyFiltersAction } from '@/app/(app)/nearby/actions'
import { INTERESTS } from '@/lib/constants/interests'
import type { NearbyCamper } from '@/lib/types/db'
import type { WaveState } from '@/components/waves/wave-button'
import { Eyebrow } from '@/components/ui/eyebrow'

type Props = {
  campers: NearbyCamper[]
  campgroundId: string
  waveStateByProfileId: Record<string, WaveState>
  /** crossed_paths.id keyed by other-camper profile_id. Threaded into
   *  each CamperCard's WaveButton so matched/connected states can
   *  deep-link to /crossed-paths/<id>. */
  crossedPathByProfileId?: Record<string, string>
  /** Wave eligibility code keyed by other-camper profile_id. "ok"
   *  unlocks the active Send a Wave button; anything else routes
   *  the WaveButton into its disabled "ineligible" state. */
  waveEligibilityByProfileId?: Record<string, string>
  viewerInterests: string[]
  initialInterests?: string[]
}

export function NearbyList({
  campers,
  campgroundId,
  waveStateByProfileId,
  crossedPathByProfileId = {},
  waveEligibilityByProfileId = {},
  viewerInterests,
  initialInterests = [],
}: Props) {
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    () => new Set(initialInterests),
  )

  const skipFirstSave = useRef(true)
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false
      return
    }
    const timer = window.setTimeout(() => {
      void saveNearbyFiltersAction([], Array.from(selectedInterests))
    }, 400)
    return () => window.clearTimeout(timer)
  }, [selectedInterests])

  const filtered = useMemo(() => {
    if (selectedInterests.size === 0) return campers
    return campers.filter((c) => {
      if (!c.interests || c.interests.length === 0) return false
      for (const slug of selectedInterests) {
        if (c.interests.includes(slug)) return true
      }
      return false
    })
  }, [campers, selectedInterests])

  function toggleInterest(slug: string) {
    setSelectedInterests((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const anyFilter = selectedInterests.size > 0

  function resetFilters() {
    setSelectedInterests(new Set())
  }

  return (
    <div className="relative space-y-5">
      {anyFilter && (
        <button
          type="button"
          onClick={resetFilters}
          className="absolute -top-12 right-0 text-[11px] font-semibold text-flame underline-offset-2 hover:underline"
        >
          Reset filters
        </button>
      )}

      <div className="space-y-2">
        <Eyebrow>Interest</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const active = selectedInterests.has(i.slug)
            return (
              <button
                key={i.slug}
                type="button"
                onClick={() => toggleInterest(i.slug)}
                aria-pressed={active}
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

      {filtered.length === 0 ? (
        campers.length === 0 ? (
          selectedInterests.size > 0 ? (
            <div className="rounded-2xl border border-leaf/40 bg-leaf/10 p-6 text-center text-sm text-cream">
              <p className="font-semibold text-leaf">
                <span aria-hidden>✓</span> Your preferences are saved.
              </p>
              <p className="mt-1 text-mist">
                We&apos;ll match you when someone checks in nearby.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
              Nobody else is checked in here right now. Come back later — or
              wave next time.
            </p>
          )
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
            No campers match those filters.
          </p>
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.profile_id}>
              <CamperCard
                camper={c}
                campgroundId={campgroundId}
                waveState={waveStateByProfileId[c.profile_id] ?? 'none'}
                crossedPathId={crossedPathByProfileId[c.profile_id] ?? null}
                waveEligibility={
                  waveEligibilityByProfileId[c.profile_id] ?? 'ok'
                }
                viewerInterests={viewerInterests}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

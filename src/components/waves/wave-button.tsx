'use client'

import { useState, useTransition } from 'react'
import { sendWaveAction } from '@/lib/actions/waves'

export type WaveState = 'none' | 'waved' | 'matched'

type Props = {
  targetId: string
  campgroundId: string
  initialState?: WaveState
}

export function WaveButton({ targetId, campgroundId, initialState = 'none' }: Props) {
  const [state, setState] = useState<WaveState>(initialState)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (state === 'matched') {
    return (
      <div className="rounded-lg border border-flame/40 bg-flame/15 px-3 py-2 text-center text-sm font-semibold text-flame">
        <span aria-hidden>👋</span> Crossed paths
      </div>
    )
  }

  if (state === 'waved') {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-mist">
        Waved · waiting
      </div>
    )
  }

  function handleWave() {
    setError(null)
    startTransition(async () => {
      const result = await sendWaveAction(targetId, campgroundId)
      if (result.error) {
        setError(result.error)
        return
      }
      setState(result.matched ? 'matched' : 'waved')
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleWave}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-flame text-night px-3 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 transition-colors"
      >
        {pending ? (
          'Waving…'
        ) : (
          <>
            Wave <span aria-hidden>👋</span>
          </>
        )}
      </button>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

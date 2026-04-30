'use client'

import { useEffect, useState, useTransition } from 'react'
import { sendWaveAction } from '@/lib/actions/waves'

export type WaveState =
  | 'none'
  | 'waved'
  | 'matched'
  | 'connected'
  | 'declined'

type Props = {
  targetId: string
  campgroundId: string
  initialState?: WaveState
}

const LABEL_BY_STATE: Record<Exclude<WaveState, 'none'>, string> = {
  waved: 'Waved · waiting',
  matched: 'Mutual wave · check your Lantern',
  connected: 'Connected',
  declined: 'Waved',
}

export function WaveButton({
  targetId,
  campgroundId,
  initialState = 'none',
}: Props) {
  const [state, setState] = useState<WaveState>(initialState)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // The post-wave confirmation toast. Per spec, the button itself
  // becomes inactive immediately and a brief confirmation appears.
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (!showToast) return
    const t = window.setTimeout(() => setShowToast(false), 4500)
    return () => window.clearTimeout(t)
  }, [showToast])

  if (state !== 'none') {
    const label = LABEL_BY_STATE[state]
    const tone =
      state === 'connected' || state === 'matched'
        ? 'border-flame/40 bg-flame/15 text-flame'
        : 'border-white/10 bg-white/5 text-mist'
    return (
      <div className="space-y-1.5">
        <div
          aria-disabled
          className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${tone}`}
        >
          {state === 'matched' && <span aria-hidden>👋 </span>}
          {label}
        </div>
        {showToast && (
          <p
            role="status"
            className="rounded-md border border-flame/30 bg-flame/10 px-2.5 py-1.5 text-[11px] leading-snug text-cream"
          >
            Your wave was sent. If they wave back, you&apos;ll hear about it
            in your Lantern.
          </p>
        )}
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
      setShowToast(true)
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

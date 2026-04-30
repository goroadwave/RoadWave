'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendWaveAction } from '@/lib/actions/waves'
import { declineWaveAction } from '@/app/(app)/waves/actions'
import { INTEREST_EMOJI, INTEREST_LABEL } from '@/lib/constants/interests'

type Props = {
  waveId: string
  senderId: string
  campgroundId: string
  rigType: string | null
  interests: string[]
}

export function IncomingWaveCard({
  waveId,
  senderId,
  campgroundId,
  rigType,
  interests,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function waveBack() {
    setError(null)
    startTransition(async () => {
      const result = await sendWaveAction(senderId, campgroundId)
      if (result.error) {
        setError(result.error)
        return
      }
      // The mutual-wave trigger fires the wave_matched notification for
      // both campers; tapping it opens the consent prompt.
      router.push('/home')
    })
  }

  function ignore() {
    setError(null)
    startTransition(async () => {
      const result = await declineWaveAction(waveId)
      if (!result.ok) {
        setError(result.error ?? 'Could not dismiss.')
        return
      }
      router.push('/home')
    })
  }

  return (
    <section className="space-y-4 rounded-2xl border border-flame/30 bg-card p-5 shadow-lg shadow-black/20">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-flame">
          Wave received
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream leading-tight">
          A nearby camper waved at you
        </h1>
      </header>

      <div className="space-y-3 rounded-xl border border-white/5 bg-night/40 p-4">
        {rigType && (
          <p className="text-sm text-cream">
            <span className="text-mist">Rig · </span>
            <span className="font-semibold">{rigType}</span>
          </p>
        )}
        {interests.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {interests.map((slug) => (
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
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={waveBack}
          disabled={pending}
          className="rounded-lg bg-flame px-4 py-2.5 text-sm font-semibold text-night shadow-md shadow-flame/20 hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Working…' : 'Wave Back 👋'}
        </button>
        <button
          type="button"
          onClick={ignore}
          disabled={pending}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-cream hover:border-white/20 disabled:opacity-50"
        >
          Ignore
        </button>
      </div>

      <p className="text-[11px] text-mist/70 leading-snug">
        Ignore dismisses this quietly — the sender is not notified. Wave
        Back lets you both decide whether to connect.
      </p>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </section>
  )
}

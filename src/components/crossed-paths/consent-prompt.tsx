'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { waveConsentAction } from '@/app/(app)/crossed-paths/actions'
import { INTEREST_EMOJI, INTEREST_LABEL } from '@/lib/constants/interests'

type Props = {
  crossedPathId: string
  rigType: string | null
  interests: string[]
}

export function ConsentPrompt({ crossedPathId, rigType, interests }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(connect: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await waveConsentAction(crossedPathId, connect)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <section className="space-y-4 rounded-2xl border border-flame/30 bg-card p-5 shadow-lg shadow-black/20">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-flame">
          You have a mutual wave
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream leading-tight">
          Would you like to connect?
        </h1>
        <p className="text-sm text-cream/85 leading-relaxed">
          You and a nearby camper have waved at each other. Would you like to
          connect and say hello?
        </p>
      </header>

      <div className="space-y-3 rounded-xl border border-white/5 bg-night/40 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mist/70">
          A nearby camper
        </p>
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
          onClick={() => submit(true)}
          disabled={pending}
          className="rounded-lg bg-flame px-4 py-2.5 text-sm font-semibold text-night shadow-md shadow-flame/20 hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Working…' : 'Connect 🎉'}
        </button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-cream hover:border-white/20 disabled:opacity-50"
        >
          Not Yet
        </button>
      </div>

      <p className="text-[11px] text-mist/70 leading-snug">
        We connect you only if both of you tap Connect. Tapping Not Yet
        dismisses this quietly — the other person isn&apos;t notified.
      </p>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </section>
  )
}

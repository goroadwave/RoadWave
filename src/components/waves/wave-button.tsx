'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { sendWaveAction } from '@/lib/actions/waves'

// Drives the Wave affordance on every camper card on the signed-in
// campground hub (and on /nearby's redirected hub view). Each state
// reflects the current relationship between the viewer and the target,
// computed server-side from the waves + crossed_paths tables.
//
//   none           — neither side has waved. Render the primary
//                    "Send a Wave 👋" button.
//   waved          — viewer has waved; target hasn't reciprocated yet.
//                    Render an inert "Wave sent 👋" pill.
//   wave_back      — target waved at viewer first, viewer hasn't
//                    responded. Render a primary "Wave back 👋"
//                    button; tapping it inserts the mutual wave, the
//                    notify_wave_matched trigger fires the consent
//                    flow for both campers (mig 0026).
//   matched        — both waved, awaiting consent on at least one
//                    side. Render a "Matched" pill + a "Say Hi →"
//                    link to /crossed-paths/<id> (the consent prompt).
//   connected      — both consented; full match. Render a "Matched"
//                    pill + "Open chat →" link to the conversation.
//   declined       — the viewer dismissed an inbound wave. Render an
//                    inert state so the camper isn't repeatedly
//                    surfaced.
//
// Privacy contract enforced upstream:
//   * sendWaveAction insertion is RLS-gated (mig 0033) so an invisible
//     target rejects the write even if a stale UI state slips through.
//   * crossedPathId is only set when the viewer is actually on the
//     crossed_paths row (RLS limits the SELECT to participants).
//   * No site numbers / GPS / cross-campground stale presence here.

export type WaveState =
  | 'none'
  | 'waved'
  | 'wave_back'
  | 'matched'
  | 'connected'
  | 'declined'

type Props = {
  targetId: string
  campgroundId: string
  initialState?: WaveState
  /** crossed_paths.id when the viewer + target are on a mutual row.
   *  Drives the "Say Hi →" / "Open chat →" deep-link on matched +
   *  connected states. Null for other states. */
  crossedPathId?: string | null
}

export function WaveButton({
  targetId,
  campgroundId,
  initialState = 'none',
  crossedPathId = null,
}: Props) {
  const [state, setState] = useState<WaveState>(initialState)
  const [crossedPath, setCrossedPath] = useState<string | null>(crossedPathId)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Brief confirmation toast under the button after a successful send.
  // Spec: the button becomes inactive immediately and a one-liner
  // confirms what happens next.
  const [showToast, setShowToast] = useState<'sent' | 'matched' | null>(null)

  useEffect(() => {
    if (!showToast) return
    const t = window.setTimeout(() => setShowToast(null), 4500)
    return () => window.clearTimeout(t)
  }, [showToast])

  if (state === 'wave_back') {
    return (
      <div>
        <button
          type="button"
          onClick={() => handleWave('wave_back')}
          disabled={pending}
          data-testid="wave-back-button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-flame text-night px-3 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {pending ? (
            'Waving back…'
          ) : (
            <>
              Wave back <span aria-hidden>👋</span>
            </>
          )}
        </button>
        <p className="mt-1 text-[11px] text-mist/80 leading-snug">
          They waved at you first. Wave back to start a match.
        </p>
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    )
  }

  if (state === 'none') {
    return (
      <div>
        <button
          type="button"
          onClick={() => handleWave('none')}
          disabled={pending}
          data-testid="send-wave-button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-flame text-night px-3 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {pending ? (
            'Waving…'
          ) : (
            <>
              Send a Wave <span aria-hidden>👋</span>
            </>
          )}
        </button>
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    )
  }

  // State is one of: waved, matched, connected, declined.
  const isMatched = state === 'matched' || state === 'connected'
  const pillLabel =
    state === 'waved'
      ? 'Wave sent 👋'
      : state === 'matched'
        ? 'Matched 🎉'
        : state === 'connected'
          ? 'Matched 🎉'
          : 'Waved' // declined fallback — quiet final state
  const tone = isMatched
    ? 'border-flame/40 bg-flame/15 text-flame'
    : 'border-white/10 bg-white/5 text-mist'
  const linkLabel = state === 'connected' ? 'Open chat →' : 'Say Hi →'

  return (
    <div className="space-y-1.5">
      <div
        aria-disabled
        data-testid={`wave-state-${state}`}
        className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${tone}`}
      >
        {pillLabel}
      </div>
      {isMatched && crossedPath && (
        <Link
          href={`/crossed-paths/${crossedPath}`}
          data-testid="say-hi-link"
          className="block w-full rounded-lg border border-flame/40 bg-flame/[0.06] text-cream px-3 py-2 text-center text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
        >
          {linkLabel}
        </Link>
      )}
      {state === 'waved' && (
        <p className="text-[11px] text-mist/80 leading-snug">
          Your wave is on its way. If they wave back, we&apos;ll light up
          your Lantern.
        </p>
      )}
      {state === 'matched' && !crossedPath && (
        <p className="text-[11px] text-mist/80 leading-snug">
          Mutual wave — check your Lantern to say hi.
        </p>
      )}
      {showToast === 'sent' && (
        <p
          role="status"
          className="rounded-md border border-flame/30 bg-flame/10 px-2.5 py-1.5 text-[11px] leading-snug text-cream"
        >
          Your wave was sent. If they wave back, you&apos;ll hear about it
          in your Lantern.
        </p>
      )}
      {showToast === 'matched' && (
        <p
          role="status"
          className="rounded-md border border-flame/40 bg-flame/15 px-2.5 py-1.5 text-[11px] leading-snug text-cream"
        >
          Mutual wave 🎉 Tap Say Hi to open the conversation.
        </p>
      )}
    </div>
  )

  function handleWave(from: 'none' | 'wave_back') {
    setError(null)
    startTransition(async () => {
      const result = await sendWaveAction(targetId, campgroundId)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.matched) {
        setState('matched')
        // The server action returns the new crossed_paths id when a
        // match was created so the freshly-rendered "Say Hi →" link
        // works without a server round-trip.
        if (result.crossedPathId) setCrossedPath(result.crossedPathId)
        setShowToast('matched')
      } else {
        setState('waved')
        setShowToast('sent')
      }
      // from arg kept for future analytics — currently identical
      // behavior whether the click started in 'none' or 'wave_back'.
      void from
    })
  }
}

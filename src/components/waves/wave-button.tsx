'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { sendWaveAction } from '@/lib/actions/waves'
import { WAVE_REASON_COPY } from '@/lib/wave/reason-copy'

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
// Additionally, when `initialEligibility` is NOT 'ok', the button
// renders a non-active disabled state with a recovery-copy hint --
// covers the "card was rendered but RLS would reject the insert"
// drift (target's check-in expired between hub render and click,
// target flipped visibility mid-session, etc.).
//
// Privacy contract enforced upstream:
//   * sendWaveAction's pre-flight (computeWaveEligibility) mirrors the
//     waves RLS so the action never silently fails. The reason code
//     is returned to the UI for accurate post-click rendering.
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
  /** Pre-flight wave eligibility reason from the hub page. "ok" =
   *  primary CTA. Anything else swaps to a disabled state with the
   *  reason copy so no camper ever taps an active button that fails. */
  initialEligibility?: string
}

export function WaveButton({
  targetId,
  campgroundId,
  initialState = 'none',
  crossedPathId = null,
  initialEligibility = 'ok',
}: Props) {
  const [state, setState] = useState<WaveState>(initialState)
  const [crossedPath, setCrossedPath] = useState<string | null>(crossedPathId)
  const [eligibility, setEligibility] = useState<string>(initialEligibility)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showToast, setShowToast] = useState<'sent' | 'matched' | null>(null)

  useEffect(() => {
    if (!showToast) return
    const t = window.setTimeout(() => setShowToast(null), 4500)
    return () => window.clearTimeout(t)
  }, [showToast])

  // INELIGIBLE branch -- the pre-flight already knows the wave would
  // be rejected. Render a quiet disabled state with the reason copy
  // instead of the primary CTA. Skip this branch when the state is
  // already a post-click state (waved / matched / connected) because
  // those override eligibility (e.g. already_waved means we ARE on
  // 'waved').
  if (
    state === 'none' &&
    eligibility !== 'ok' &&
    eligibility !== 'already_waved' &&
    eligibility !== 'already_matched'
  ) {
    const copy =
      (WAVE_REASON_COPY as Record<string, string>)[eligibility] ??
      WAVE_REASON_COPY.rls_denied
    // Sender-side reasons are the only ones the camper themselves can
    // resolve. Surface a direct CTA to the setup surface so the camper
    // doesn't read "Wave not available" with nothing to act on. Other
    // reasons (recipient state, shared check-in, RLS) depend on the
    // other camper or the network, so no CTA there.
    const senderCta =
      eligibility === 'sender_missing_profile'
        ? { href: '/profile/setup', label: 'Complete profile' }
        : eligibility === 'sender_invisible'
          ? {
              href: '/settings/privacy',
              label: 'Set visibility',
            }
          : null
    return (
      <div className="space-y-1">
        <div
          aria-disabled
          data-testid="wave-ineligible"
          data-eligibility-reason={eligibility}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-mist"
        >
          Wave not available
        </div>
        <p className="text-[11px] text-mist/80 leading-snug">{copy}</p>
        {senderCta && (
          <Link
            href={senderCta.href}
            data-testid="wave-ineligible-cta"
            className="block w-full rounded-lg border border-flame/40 bg-flame/[0.06] text-cream px-3 py-2 text-center text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
          >
            {senderCta.label} →
          </Link>
        )}
      </div>
    )
  }

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
        // If the server told us a specific reason, route to the
        // ineligible branch on the next render instead of just
        // surfacing a transient error. This catches a race where the
        // pre-flight on the hub passed but the actual insert was
        // rejected -- the camper now sees the disabled state with
        // the correct copy.
        if (result.reason && result.reason !== 'rls_denied') {
          setEligibility(result.reason)
        }
        setError(result.error)
        return
      }
      if (result.matched) {
        setState('matched')
        if (result.crossedPathId) setCrossedPath(result.crossedPathId)
        setShowToast('matched')
      } else {
        setState('waved')
        setShowToast('sent')
      }
      void from
    })
  }
}

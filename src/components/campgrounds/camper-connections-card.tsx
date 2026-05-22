'use client'

import Link from 'next/link'
import { useActionState, useTransition } from 'react'
import { setVisibilityModeAction, type VisibilityState } from '@/app/(app)/settings/privacy/actions'
import { NearbyList } from '@/components/nearby/nearby-list'
import type { NearbyCamper } from '@/lib/types/db'
import type { WaveState } from '@/components/waves/wave-button'

// Camper Connections — the signed-in layer on top of the campground
// guest hub. Renders in place of the anonymous "Meet Other Campers —
// Optional" CTA card when the camper is authed at this campground.
//
// Privacy contract enforced by this surface:
//   * No exact site number is ever displayed (NearbyList renders
//     rig_type + shared interests only; see nearby_campers RPC).
//   * No always-on GPS — presence is a session-scoped check_ins row
//     established server-side when the camper lands on this hub.
//   * The visibility pills (Visible / Quiet / Invisible) are the
//     primary, always-visible control so the camper can drop out of
//     the list in one tap.
//   * No campground-wide chat. Connection only opens after a mutual
//     wave, handled by the existing wave/crossed-paths flow.

type Visibility = 'visible' | 'quiet' | 'invisible'

type Props = {
  campgroundId: string
  campgroundSlug: string
  campers: NearbyCamper[]
  waveStateByProfileId: Record<string, WaveState>
  /** crossed_paths.id keyed by other-camper profile_id. Threaded
   *  through NearbyList → CamperCard → WaveButton so matched +
   *  connected campers get the Say Hi → / Open chat → deep-link
   *  directly on the card. */
  crossedPathByProfileId?: Record<string, string>
  /** Wave eligibility code keyed by other-camper profile_id (the
   *  same key as waveStateByProfileId). "ok" = active button safe.
   *  Anything else = the wave RLS would reject -- WaveButton
   *  renders a disabled state with a recovery hint instead of the
   *  primary Send a Wave CTA. */
  waveEligibilityByProfileId?: Record<string, string>
  viewerInterests: string[]
  initialInterests?: string[]
  currentVisibility: Visibility
  /** Set when the viewer is in campground_updates_only mode. The
   *  visibility pills still render so they can drop back into a
   *  social mode in one tap, but the camper list is hidden. */
  updatesOnlyMode?: boolean
}

const VISIBILITY_OPTIONS: {
  mode: Visibility
  label: string
  description: string
  accent: string
  dot: string
}[] = [
  {
    mode: 'visible',
    label: 'Visible',
    description: 'Other campers here can see your shared interests and wave.',
    accent: 'border-leaf/40 bg-leaf/[0.08] text-leaf',
    dot: 'bg-leaf',
  },
  {
    mode: 'quiet',
    label: 'Quiet',
    description: 'You can still see and wave, but you do not appear in the list.',
    accent: 'border-amber-300/40 bg-amber-300/[0.08] text-amber-300',
    dot: 'bg-amber-300',
  },
  {
    mode: 'invisible',
    label: 'Invisible',
    description: 'Nobody can see or wave at you. You can browse but stay hidden.',
    accent: 'border-white/15 bg-white/5 text-mist',
    dot: 'bg-mist',
  },
]

export function CamperConnectionsCard({
  campgroundId,
  campgroundSlug,
  campers,
  waveStateByProfileId,
  crossedPathByProfileId = {},
  waveEligibilityByProfileId = {},
  viewerInterests,
  initialInterests = [],
  currentVisibility,
  updatesOnlyMode = false,
}: Props) {
  return (
    <section id="camper-connections" className="space-y-3 scroll-mt-4">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Camper connections
      </h2>
      <div className="rounded-2xl border border-flame/30 bg-flame/[0.05] p-5 sm:p-6 space-y-6">
        <div className="space-y-2">
          <p className="font-display text-xl sm:text-2xl font-extrabold text-cream leading-[1.15]">
            Find your campground people without making it weird.
          </p>
          <p className="text-sm text-cream/90 leading-relaxed">
            See campers here who share your interests. Wave if you want to
            connect. Nothing opens unless it&apos;s mutual.
          </p>
        </div>

        <VisibilityPills
          campgroundSlug={campgroundSlug}
          currentVisibility={
            updatesOnlyMode ? 'invisible' : currentVisibility
          }
          updatesOnlyMode={updatesOnlyMode}
        />

        <div className="flex flex-wrap gap-2">
          <Link
            href="/profile/setup"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
          >
            Edit interests
          </Link>
          <Link
            href="/settings/privacy"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-white/10 hover:border-white/30 transition-colors"
          >
            Privacy settings
          </Link>
        </div>

        <ul className="space-y-1.5 text-xs text-mist leading-snug border-t border-white/5 pt-4">
          <li className="flex items-start gap-2">
            <span className="text-flame mt-0.5" aria-hidden>
              ✓
            </span>
            <span>No exact site number is ever shown.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-flame mt-0.5" aria-hidden>
              ✓
            </span>
            <span>No always-on GPS — presence ends with your stay.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-flame mt-0.5" aria-hidden>
              ✓
            </span>
            <span>
              No campground-wide chat. Waves stay private; conversation only
              opens after a mutual hello.
            </span>
          </li>
        </ul>

        {updatesOnlyMode ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1.5">
            <p className="text-sm font-semibold text-cream">
              Campers Here is paused while you&apos;re in Updates Only mode.
            </p>
            <p className="text-xs text-mist leading-snug">
              Pick Visible or Quiet above to start seeing campers here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-flame font-semibold">
                Campers here
              </p>
              <p className="text-xs text-mist leading-snug">
                Wave when the vibe feels right.
              </p>
            </div>
            <NearbyList
              campers={campers}
              campgroundId={campgroundId}
              waveStateByProfileId={waveStateByProfileId}
              crossedPathByProfileId={crossedPathByProfileId}
              waveEligibilityByProfileId={waveEligibilityByProfileId}
              viewerInterests={viewerInterests}
              initialInterests={initialInterests}
            />
          </div>
        )}
      </div>
    </section>
  )
}

function VisibilityPills({
  campgroundSlug,
  currentVisibility,
  updatesOnlyMode,
}: {
  campgroundSlug: string
  currentVisibility: Visibility
  updatesOnlyMode: boolean
}) {
  // useActionState wires the server action to React's pending-transition
  // model. We render an optimistic pending state on the pill the camper
  // just tapped so the UI confirms the flip even before the server
  // round-trip completes.
  const [, formAction] = useActionState<VisibilityState, FormData>(
    setVisibilityModeAction,
    { error: null, ok: false },
  )
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-mist font-semibold">
          You control your visibility
        </p>
        {updatesOnlyMode && (
          <Link
            href="/settings/privacy"
            className="text-[11px] font-semibold text-flame underline-offset-2 hover:underline"
          >
            Updates only — change
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {VISIBILITY_OPTIONS.map((opt) => {
          const active = opt.mode === currentVisibility
          return (
            <button
              key={opt.mode}
              type="button"
              aria-pressed={active}
              disabled={pending && !active}
              onClick={() => {
                if (active) return
                const fd = new FormData()
                fd.set('mode', opt.mode)
                fd.set('slug', campgroundSlug)
                startTransition(() => formAction(fd))
              }}
              className={
                active
                  ? `inline-flex items-center gap-1.5 rounded-full border ${opt.accent} px-2.5 py-1 text-[11px] font-semibold shadow-sm`
                  : 'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] text-mist px-2.5 py-1 text-[11px] font-medium hover:border-white/30 hover:text-cream transition-colors disabled:opacity-50'
              }
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${active ? opt.dot : 'bg-white/30'}`}
              />
              {opt.label}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-mist leading-snug">
        {VISIBILITY_OPTIONS.find((o) => o.mode === currentVisibility)
          ?.description ?? VISIBILITY_OPTIONS[0].description}
      </p>
    </div>
  )
}

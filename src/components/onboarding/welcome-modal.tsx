'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  saveOnboardingInterests,
  saveOnboardingPrivacy,
  saveOnboardingTravelStyle,
} from '@/components/onboarding/actions'

const TRAVEL_STYLE_OPTIONS: { slug: string; label: string }[] = [
  { slug: 'full_timer', label: 'Full-timer' },
  { slug: 'weekender', label: 'Weekender' },
  { slug: 'snowbird', label: 'Snowbird' },
  { slug: 'seasonal_guest', label: 'Seasonal guest' },
  { slug: 'camp_host', label: 'Camp host' },
  { slug: 'work_camper', label: 'Work camper' },
  { slug: 'solo_traveler', label: 'Solo traveler' },
  { slug: 'traveling_for_work', label: 'Traveling for work' },
  { slug: 'family_traveler', label: 'Family traveler' },
  { slug: 'prefer_quiet', label: 'Prefer quiet' },
]

const PRIVACY_OPTIONS: {
  slug: 'visible' | 'quiet' | 'invisible'
  label: string
  emoji: string
  desc: string
}[] = [
  {
    slug: 'visible',
    label: 'Visible',
    emoji: '👁',
    desc: 'You appear in the nearby list. Open to waves.',
  },
  {
    slug: 'quiet',
    label: 'Quiet',
    emoji: '🤫',
    desc: 'Hidden, but you can still wave first.',
  },
  {
    slug: 'invisible',
    label: 'Invisible',
    emoji: '👻',
    desc: 'Browse without anyone knowing you are here.',
  },
]

type Step = 1 | 2 | 3 | 'done'

export function WelcomeModal({
  firstName,
  needsTravelStyle,
  needsInterests,
  interests,
}: {
  firstName: string
  needsTravelStyle: boolean
  needsInterests: boolean
  interests: { slug: string; label: string }[]
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(needsTravelStyle ? 1 : 2)
  const [pickedInterests, setPickedInterests] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function chooseTravelStyle(slug: string) {
    setError(null)
    startTransition(async () => {
      const res = await saveOnboardingTravelStyle(slug)
      if (!res.ok) {
        setError(res.error ?? 'Could not save. Try again.')
        return
      }
      setStep(needsInterests ? 2 : 3)
    })
  }

  function toggleInterest(slug: string) {
    setPickedInterests((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function submitInterests() {
    setError(null)
    if (pickedInterests.size === 0) {
      setError('Pick at least one — you can edit later.')
      return
    }
    startTransition(async () => {
      const res = await saveOnboardingInterests(Array.from(pickedInterests))
      if (!res.ok) {
        setError(res.error ?? 'Could not save. Try again.')
        return
      }
      setStep(3)
    })
  }

  function choosePrivacy(mode: 'visible' | 'quiet' | 'invisible') {
    setError(null)
    startTransition(async () => {
      const res = await saveOnboardingPrivacy(mode)
      if (!res.ok) {
        setError(res.error ?? 'Could not save. Try again.')
        return
      }
      setStep('done')
      // Refresh after a beat so the home page re-renders without the modal,
      // and the celebratory state is the last thing the user sees.
      window.setTimeout(() => router.refresh(), 1800)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/80 backdrop-blur-sm px-4 py-6 overflow-y-auto"
    >
      <div className="w-full max-w-md rounded-3xl border border-flame/30 bg-card shadow-2xl shadow-black/60 my-auto">
        <div className="px-5 pt-5 pb-3 text-center space-y-2 border-b border-white/5">
          <div className="mx-auto h-16 w-16 rounded-full overflow-hidden border-2 border-flame/40 shadow-lg shadow-flame/15">
            {/* eslint-disable-next-line @next/next/no-img-element -- mounted before next/image domain config matters */}
            <img
              src="/riley.png"
              alt="Riley"
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <h2
            id="welcome-modal-title"
            className="font-display text-xl font-extrabold text-cream"
          >
            Welcome to RoadWave{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p className="font-serif italic text-flame text-sm leading-snug">
            Three quick taps and you&apos;re ready to wave.
          </p>
          <ProgressDots step={step} />
        </div>

        <div className="px-5 py-5">
          {step === 1 && (
            <StepShell
              eyebrow="Step 1 of 3"
              title="Pick your travel style"
              hint="Choose the one that fits you best. You can change it later."
            >
              <div className="flex flex-wrap gap-1.5">
                {TRAVEL_STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => chooseTravelStyle(s.slug)}
                    disabled={isPending}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream hover:bg-flame hover:text-night hover:border-flame disabled:opacity-50 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              eyebrow="Step 2 of 3"
              title="Choose your interests"
              hint="Tap as many as you like. Helps the right neighbors find you."
            >
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto -mr-1 pr-1">
                {interests.map((i) => {
                  const active = pickedInterests.has(i.slug)
                  return (
                    <button
                      key={i.slug}
                      type="button"
                      onClick={() => toggleInterest(i.slug)}
                      aria-pressed={active}
                      className={
                        active
                          ? 'rounded-full bg-flame px-3 py-1.5 text-xs font-semibold text-night'
                          : 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream hover:border-flame/40'
                      }
                    >
                      {i.label}
                    </button>
                  )
                })}
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={submitInterests}
                  disabled={isPending}
                  className={primaryBtn}
                >
                  {isPending ? 'Saving…' : 'Continue'}
                </button>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              eyebrow="Step 3 of 3"
              title="Set your privacy mode"
              hint="You can switch anytime — one tap from your home screen."
            >
              <div className="space-y-2">
                {PRIVACY_OPTIONS.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => choosePrivacy(p.slug)}
                    disabled={isPending}
                    className="w-full text-left flex items-start gap-3 rounded-xl border border-white/10 bg-card hover:border-flame/40 hover:bg-flame/5 disabled:opacity-50 px-3 py-2.5 transition-colors"
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {p.emoji}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-cream">
                        {p.label}
                      </span>
                      <span className="block text-xs text-mist leading-snug">
                        {p.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 'done' && (
            <div className="text-center space-y-3 py-2">
              <p className="text-5xl" aria-hidden>
                🎉
              </p>
              <p className="font-display text-xl font-extrabold text-cream">
                You&apos;re all set!
              </p>
              <p className="font-serif italic text-flame text-sm leading-snug">
                Profile saved. Welcome to the campground.
              </p>
            </div>
          )}

          {error && step !== 'done' && (
            <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressDots({ step }: { step: Step }) {
  const stepNum = step === 'done' ? 4 : step
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      {[1, 2, 3].map((i) => {
        const filled = stepNum >= i
        return (
          <span
            key={i}
            aria-hidden
            className={
              filled
                ? 'h-1.5 w-6 rounded-full bg-flame transition-colors'
                : 'h-1.5 w-6 rounded-full bg-white/15 transition-colors'
            }
          />
        )
      })}
    </div>
  )
}

function StepShell({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          {eyebrow}
        </p>
        <h3 className="font-display text-lg font-extrabold text-cream leading-tight">
          {title}
        </h3>
        <p className="text-xs text-mist leading-snug">{hint}</p>
      </div>
      {children}
    </div>
  )
}

const primaryBtn =
  'w-full rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'

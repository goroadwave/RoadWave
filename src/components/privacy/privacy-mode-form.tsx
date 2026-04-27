'use client'

import { useActionState } from 'react'
import { Eye, EyeOff, Ghost } from 'lucide-react'
import { savePrivacyModeAction, type PrivacyState } from '@/app/(app)/privacy/actions'
import type { PrivacyMode } from '@/lib/types/db'

const initialState: PrivacyState = { error: null, ok: false }

const OPTIONS: {
  value: PrivacyMode
  label: string
  Icon: typeof Eye
  blurb: string
  bullets: string[]
}[] = [
  {
    value: 'visible',
    label: 'Visible',
    Icon: Eye,
    blurb: 'Show up in the nearby list. Open to waves.',
    bullets: [
      'You appear in the nearby list at your campground.',
      'You can wave at others. They can wave at you.',
      'Mutual waves create Crossed Paths.',
    ],
  },
  {
    value: 'quiet',
    label: 'Quiet',
    Icon: EyeOff,
    blurb: 'Hidden, but you can still wave first.',
    bullets: [
      'You stay out of the nearby list.',
      'You can wave first at Visible campers.',
      "Others can't wave at you, so matches only happen if you flip Visible.",
    ],
  },
  {
    value: 'invisible',
    label: 'Invisible',
    Icon: Ghost,
    blurb: 'Just here to look around.',
    bullets: [
      'You stay out of the nearby list.',
      "You can't wave or be waved at.",
      'A pure observer mode for when you want privacy.',
    ],
  },
]

export function PrivacyModeForm({ currentMode }: { currentMode: PrivacyMode }) {
  const [state, formAction, pending] = useActionState(savePrivacyModeAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.Icon
          return (
            <label
              key={opt.value}
              className="flex gap-4 rounded-2xl border border-white/10 bg-card p-4 cursor-pointer has-checked:border-flame has-checked:bg-flame/10"
            >
              <input
                type="radio"
                name="privacy_mode"
                value={opt.value}
                defaultChecked={currentMode === opt.value}
                className="mt-1 h-4 w-4 accent-flame"
              />
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-flame/10 text-flame">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div className="flex-1">
                <div className="text-base font-semibold text-cream">{opt.label}</div>
                <p className="mt-1 font-serif italic text-flame text-base leading-snug">
                  {opt.blurb}
                </p>
                <ul className="mt-2 list-disc list-inside space-y-0.5 text-xs text-mist">
                  {opt.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </label>
          )
        })}
      </div>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-flame text-night px-5 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save privacy mode'}
      </button>
    </form>
  )
}

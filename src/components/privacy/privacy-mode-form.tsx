'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Ghost, MapPin } from 'lucide-react'
import { savePrivacyModeAction, type PrivacyState } from '@/app/(app)/settings/privacy/actions'
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
  {
    value: 'campground_only',
    label: 'Campground Only',
    Icon: MapPin,
    blurb: 'See campground bulletins and meetups — and nothing else.',
    bullets: [
      'You stay out of the nearby list and can’t send or receive waves.',
      'You still see campground bulletins and meetups (toggle each below).',
      'You count for owner activity stats so RSVPs reflect you.',
    ],
  },
]

type Props = {
  currentMode: PrivacyMode
  shareBulletins: boolean
  shareMeetups: boolean
}

export function PrivacyModeForm({
  currentMode,
  shareBulletins,
  shareMeetups,
}: Props) {
  const [state, formAction, pending] = useActionState(savePrivacyModeAction, initialState)
  const [mode, setMode] = useState<PrivacyMode>(currentMode)
  const [bulletins, setBulletins] = useState(shareBulletins)
  const [meetups, setMeetups] = useState(shareMeetups)

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
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
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
                {opt.value === 'campground_only' && mode === 'campground_only' && (
                  <fieldset className="mt-3 rounded-xl border border-flame/30 bg-flame/[0.06] p-3 space-y-2">
                    <legend className="px-1 text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
                      What you still see
                    </legend>
                    <Toggle
                      label="Campground Bulletins"
                      sub="Announcements + notices from the campground."
                      checked={bulletins}
                      onChange={setBulletins}
                    />
                    <Toggle
                      label="Meetups & Activities"
                      sub="Hosted meetups + RSVP."
                      checked={meetups}
                      onChange={setMeetups}
                    />
                  </fieldset>
                )}
              </div>
            </label>
          )
        })}
      </div>

      {/* Submit the toggles regardless of selected mode so a user can
          pre-set their preference and have it stick when they flip
          into campground_only later. */}
      <input
        type="hidden"
        name="share_bulletins"
        value={bulletins ? 'on' : ''}
      />
      <input
        type="hidden"
        name="share_meetups"
        value={meetups ? 'on' : ''}
      />

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

function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string
  sub: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-flame"
      />
      <span className="flex-1">
        <span className="block text-sm font-semibold text-cream">{label}</span>
        <span className="block text-[11px] text-mist leading-snug">{sub}</span>
      </span>
    </label>
  )
}

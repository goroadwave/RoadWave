'use client'

import { useActionState, useState } from 'react'
import {
  quickCheckInAction,
  type QuickCheckInState,
} from '@/app/quickcheckin/actions'

// Visibility option triplet matching the quickCheckInAction schema.
const VISIBILITY_OPTIONS = [
  {
    value: 'visible',
    label: 'Visible',
    body: 'In the list. Open to a wave hello.',
  },
  {
    value: 'quiet',
    label: 'Quiet',
    body: 'Hidden, but you can still wave first.',
  },
  {
    value: 'invisible',
    label: 'Invisible',
    body: 'Here to look around only.',
  },
] as const

type Interest = { slug: string; label: string }

const initial: QuickCheckInState = { error: null }

export function QuickCheckInForm({
  slug,
  token,
  campgroundName,
  interests,
}: {
  slug: string
  token: string
  campgroundName: string
  interests: Interest[]
}) {
  const [state, formAction, pending] = useActionState(
    quickCheckInAction,
    initial,
  )
  const [visibility, setVisibility] = useState<string>('visible')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleInterest(s: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />

      {/* Visibility — radio group rendered as cards */}
      <fieldset className="space-y-2">
        <legend className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold mb-2">
          Visibility
        </legend>
        <div className="grid gap-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const isSelected = visibility === opt.value
            return (
              <label
                key={opt.value}
                className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-flame bg-flame/10'
                    : 'border-white/5 bg-card hover:border-flame/40'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setVisibility(opt.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    isSelected
                      ? 'border-flame bg-flame'
                      : 'border-white/30 bg-transparent'
                  }`}
                >
                  {isSelected && (
                    <span className="block h-2 w-2 rounded-full bg-night" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-cream">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-mist leading-snug">
                    {opt.body}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Interests — chip toggles */}
      {interests.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold mb-2">
            Interests · pick any
          </legend>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => {
              const isSelected = selected.has(i.slug)
              return (
                <button
                  key={i.slug}
                  type="button"
                  onClick={() => toggleInterest(i.slug)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'bg-leaf text-night'
                      : 'bg-card text-cream/85 border border-white/10 hover:border-flame/40'
                  }`}
                >
                  {i.label}
                </button>
              )
            })}
          </div>
          {/* Hidden inputs so the form submission includes the array */}
          {Array.from(selected).map((s) => (
            <input key={s} type="hidden" name="interests" value={s} />
          ))}
        </fieldset>
      )}

      {/* Compliance toggle — required by the action's schema. */}
      <label className="flex items-start gap-2 text-xs text-mist leading-snug px-1 cursor-pointer">
        <input
          type="checkbox"
          name="accept_terms"
          required
          className="mt-0.5 h-4 w-4 accent-flame"
        />
        <span>
          I&apos;m 18+ and I agree to the{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame underline-offset-2 hover:underline"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame underline-offset-2 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-4 text-base font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Checking you in…' : `Complete Check-In to ${campgroundName}`}
      </button>
    </form>
  )
}

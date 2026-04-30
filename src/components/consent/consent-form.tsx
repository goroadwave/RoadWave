'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import {
  recordConsentAction,
  type ConsentState,
} from '@/app/consent/actions'

const initialState: ConsentState = { error: null }

type Props = {
  next: string
  userEmail: string | null
}

export function ConsentForm({ next, userEmail }: Props) {
  const [state, formAction, pending] = useActionState(
    recordConsentAction,
    initialState,
  )
  const [age, setAge] = useState(false)
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [rules, setRules] = useState(false)
  const allChecked = age && terms && privacy && rules

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <CheckboxRow
        name="confirm_18"
        checked={age}
        onChange={setAge}
        label={
          <>
            I confirm I am 18 years of age or older. RoadWave is not available
            to minors.
          </>
        }
      />

      <CheckboxRow
        name="accept_terms"
        checked={terms}
        onChange={setTerms}
        label={
          <>
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              className="text-flame underline-offset-2 hover:underline"
            >
              Terms of Service
            </Link>
            .
          </>
        }
      />

      <CheckboxRow
        name="accept_privacy"
        checked={privacy}
        onChange={setPrivacy}
        label={
          <>
            I agree to the{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="text-flame underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </>
        }
      />

      <CheckboxRow
        name="accept_community_rules"
        checked={rules}
        onChange={setRules}
        label={
          <>
            I agree to the{' '}
            <Link
              href="/community-rules"
              target="_blank"
              className="text-flame underline-offset-2 hover:underline"
            >
              Community Rules
            </Link>
            .
          </>
        }
      />

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!allChecked || pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 font-semibold shadow-lg shadow-flame/10 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Recording…' : 'Continue'}
      </button>

      {userEmail && (
        <p className="text-center text-[11px] text-mist/80">
          Signed in as <span className="text-cream">{userEmail}</span>.
        </p>
      )}
    </form>
  )
}

function CheckboxRow({
  name,
  checked,
  onChange,
  label,
}: {
  name: string
  checked: boolean
  onChange: (v: boolean) => void
  label: React.ReactNode
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-mist">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-0.5 h-5 w-5 shrink-0 rounded border border-white/30 bg-white/5 accent-flame cursor-pointer"
      />
      <span>{label}</span>
    </label>
  )
}

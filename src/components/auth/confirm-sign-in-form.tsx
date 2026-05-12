'use client'

import { useActionState } from 'react'
import {
  verifyMagicLinkAction,
  type VerifyMagicLinkState,
} from '@/app/auth/sign-in/actions'

// Client island for the form on /auth/sign-in. Renders a single
// "Sign in to RoadWave" button that posts the token_hash from the
// page's URL to the verify server action.

const initialState: VerifyMagicLinkState = { error: null }

type Props = {
  tokenHash: string
  email: string | null
  next: string
}

export function ConfirmSignInForm({ tokenHash, email, next }: Props) {
  const [state, formAction, pending] = useActionState(
    verifyMagicLinkAction,
    initialState,
  )

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="th" value={tokenHash} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 text-base font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Signing you in…' : 'Sign in to RoadWave'}
      </button>
      {email && (
        <p className="text-center text-[11px] text-mist/80">
          You&apos;ll sign in as <span className="text-cream">{email}</span>.
        </p>
      )}
      {state.error && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {state.error}
        </p>
      )}
    </form>
  )
}

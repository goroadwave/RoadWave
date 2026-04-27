'use client'

import { useActionState } from 'react'
import { resendAction, type ResendState } from '@/app/(auth)/verify/actions'

const initialState: ResendState = { error: null, ok: false }

export function ResendForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState(resendAction, initialState)

  return (
    <form action={formAction} className="flex flex-col sm:flex-row gap-2">
      <input
        name="email"
        type="email"
        required
        defaultValue={defaultEmail}
        placeholder="you@example.com"
        className="flex-1 rounded-md border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-flame"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-flame text-night px-3 py-1.5 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Resend'}
      </button>
      {state.ok && (
        <span className="sr-only" aria-live="polite">
          Verification email sent.
        </span>
      )}
      {state.error && (
        <span className="sr-only" aria-live="polite">
          {state.error}
        </span>
      )}
    </form>
  )
}

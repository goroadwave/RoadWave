'use client'

import { useActionState } from 'react'
import {
  resendOwnerMagicLinkAction,
  type ResendMagicLinkState,
} from '@/app/owners/success/actions'

// Client island for the "Email me my dashboard link" button on
// /owners/success. The server action looks up the submission by the
// Stripe session_id, regenerates a magic link via the Supabase admin
// client, and emails it to the address on the submission row (never
// to a user-supplied value).

const initialState: ResendMagicLinkState = { ok: false, message: null }

export function ResendMagicLinkForm({ sessionId }: { sessionId: string }) {
  const [state, formAction, pending] = useActionState(
    resendOwnerMagicLinkAction,
    initialState,
  )

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="session_id" value={sessionId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Sending…' : 'Email me my dashboard link'}
      </button>
      {state.message && (
        <p
          className={
            state.ok
              ? 'rounded-md border border-leaf/30 bg-leaf/10 px-3 py-2 text-xs text-leaf'
              : 'rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200'
          }
        >
          {state.message}
        </p>
      )}
    </form>
  )
}

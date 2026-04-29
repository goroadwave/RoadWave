'use client'

import { useActionState, useState } from 'react'
import {
  deleteAccountAction,
  type DeleteState,
} from '@/app/(app)/settings/delete-account/actions'

const initialState: DeleteState = { error: null }

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialState,
  )
  const [confirm, setConfirm] = useState('')
  const ready = confirm.trim() === 'DELETE'

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-5 space-y-4"
    >
      <div>
        <label htmlFor="confirm_text" className="block text-sm font-medium text-cream">
          Type <span className="font-mono text-red-200">DELETE</span> to confirm
        </label>
        <input
          id="confirm_text"
          name="confirm_text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 text-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 font-mono tracking-widest"
          placeholder="DELETE"
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 text-white px-4 py-2.5 font-semibold shadow-lg shadow-red-500/10 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Deleting…' : 'Permanently delete my account'}
      </button>
    </form>
  )
}

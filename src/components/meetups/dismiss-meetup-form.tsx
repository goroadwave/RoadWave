'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  dismissMeetupAction,
  type DismissMeetupState,
} from '@/app/(app)/meetups/actions'

// Per-camper "clear this from my list" button on each meetup card on
// the signed-in /meetups page. Optimistic: the card collapses to a
// small "Cleared" status the moment the camper taps Clear, even
// before the server action resolves. The next /meetups render (after
// revalidatePath in the action) drops the card entirely.
//
// Does NOT delete the underlying meetup row, does NOT affect any
// other camper, does NOT affect the owner's view. See action +
// migration 0061 for the storage / RLS shape.

const initialState: DismissMeetupState = { error: null, ok: false }

type Props = {
  meetupId: string
  /** Short label for the button text. Defaults to "Clear" -- the spec
   *  noted "Clear" or "Dismiss" both work; "Clear" reads slightly
   *  less harsh on a campground experience. */
  label?: string
}

export function DismissMeetupForm({ meetupId, label = 'Clear' }: Props) {
  const [state, formAction, pending] = useActionState(
    dismissMeetupAction,
    initialState,
  )
  // Optimistic collapse the instant the camper taps. The card stays
  // out of the way until the next page render drops it entirely.
  // If the action errors, restore the button so the camper can
  // retry (and surface the message in a small tooltip-style hint).
  const [optimisticallyHidden, setOptimisticallyHidden] = useState(false)
  useEffect(() => {
    if (state.error) setOptimisticallyHidden(false)
  }, [state.error])

  if (state.ok || optimisticallyHidden) {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1 text-[11px] text-mist/80"
        aria-live="polite"
      >
        <span aria-hidden>✓</span>
        Cleared
      </span>
    )
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setOptimisticallyHidden(true)}
      className="shrink-0"
    >
      <input type="hidden" name="meetup_id" value={meetupId} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Clear this meetup from my list"
        title="Clear from my list"
        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[11px] text-mist hover:text-cream hover:border-white/30 hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
      >
        <span aria-hidden className="leading-none">
          ✕
        </span>
        {label}
      </button>
      {state.error && (
        <p
          role="alert"
          className="mt-1 text-[10px] text-red-300 leading-snug"
        >
          {state.error}
        </p>
      )}
    </form>
  )
}

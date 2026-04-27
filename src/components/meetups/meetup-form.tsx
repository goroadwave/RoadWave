'use client'

import { useActionState, useEffect, useRef } from 'react'
import {
  createMeetupAction,
  type MeetupCreateState,
} from '@/app/(app)/meetups/actions'

const initialState: MeetupCreateState = { error: null, ok: false }

export function MeetupForm({ campgroundId }: { campgroundId: string }) {
  const [state, formAction, pending] = useActionState(createMeetupAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset()
    }
  }, [state.ok])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-2xl border border-white/5 bg-card p-4"
    >
      <input type="hidden" name="campground_id" value={campgroundId} />

      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Title</label>
        <input
          name="title"
          required
          maxLength={120}
          placeholder="Sunset campfire"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Location</label>
        <input
          name="location"
          maxLength={120}
          placeholder="Pavilion, fire ring 3, etc."
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">Starts</label>
          <input
            name="start_at"
            type="datetime-local"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">
            Ends <span className="text-xs text-mist">(optional)</span>
          </label>
          <input name="end_at" type="datetime-local" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Description</label>
        <textarea
          name="description"
          maxLength={1000}
          rows={3}
          placeholder="Bring a chair. We'll have hot cocoa."
          className={`${inputCls} resize-y`}
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-leaf/30 bg-leaf/10 p-2 text-sm text-leaf">
          Meetup posted.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? 'Posting…' : 'Post meetup'}
      </button>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

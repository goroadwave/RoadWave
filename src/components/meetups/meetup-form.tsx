'use client'

import { useActionState, useEffect, useRef } from 'react'
import {
  createMeetupAction,
  type MeetupCreateState,
  type MeetupFormFields,
} from '@/app/(app)/meetups/actions'

const initialState: MeetupCreateState = {
  error: null,
  ok: false,
  fieldError: null,
  fields: {
    title: '',
    location: '',
    start_at: '',
    end_at: '',
    description: '',
  },
}

export function MeetupForm({ campgroundId }: { campgroundId: string }) {
  const [state, formAction, pending] = useActionState(createMeetupAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  // Per-field refs so we can focus the offending input on
  // validation failure (and so the inline highlight has a target
  // for screen readers via aria-describedby).
  const titleRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)
  const startAtRef = useRef<HTMLInputElement>(null)
  const endAtRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Reset only on success. On error, defaultValue from state.fields
  // restores everything the owner typed so they don't have to retype.
  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset()
    }
  }, [state.ok])

  // Focus the offending field on validation failure so the owner
  // can fix it immediately. Ignores success + null cases.
  useEffect(() => {
    if (state.ok || !state.fieldError) return
    const ref = refForField(state.fieldError, {
      title: titleRef,
      location: locationRef,
      start_at: startAtRef,
      end_at: endAtRef,
      description: descriptionRef,
    })
    ref?.current?.focus()
  }, [state.ok, state.fieldError])

  const fields = state.fields ?? initialState.fields!

  const errorClass = 'border-red-500/60 focus:border-red-400 focus:ring-red-400/40'
  function fieldCls(name: keyof MeetupFormFields, extra = '') {
    const bad = state.fieldError === name
    return `${bad ? `${inputCls.replace('border-white/10', '')} ${errorClass}` : inputCls} ${extra}`.trim()
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-2xl border border-white/5 bg-card p-4"
      noValidate
    >
      <input type="hidden" name="campground_id" value={campgroundId} />

      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Title</label>
        <input
          ref={titleRef}
          name="title"
          required
          maxLength={120}
          defaultValue={fields.title}
          placeholder="Sunset campfire"
          className={fieldCls('title')}
          aria-invalid={state.fieldError === 'title' || undefined}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Location</label>
        <input
          ref={locationRef}
          name="location"
          maxLength={120}
          defaultValue={fields.location}
          placeholder="Pavilion, fire ring 3, etc."
          className={fieldCls('location')}
          aria-invalid={state.fieldError === 'location' || undefined}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">Starts</label>
          <input
            ref={startAtRef}
            name="start_at"
            type="datetime-local"
            required
            defaultValue={fields.start_at}
            className={fieldCls('start_at')}
            aria-invalid={state.fieldError === 'start_at' || undefined}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">
            Ends <span className="text-xs text-mist">(optional)</span>
          </label>
          <input
            ref={endAtRef}
            name="end_at"
            type="datetime-local"
            defaultValue={fields.end_at}
            className={fieldCls('end_at')}
            aria-invalid={state.fieldError === 'end_at' || undefined}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-cream">Description</label>
        <textarea
          ref={descriptionRef}
          name="description"
          maxLength={1000}
          rows={3}
          defaultValue={fields.description}
          placeholder="Bring a chair. We'll have hot cocoa."
          className={`${fieldCls('description')} resize-y`}
          aria-invalid={state.fieldError === 'description' || undefined}
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300"
        >
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

type FieldRefMap = {
  title: React.RefObject<HTMLInputElement | null>
  location: React.RefObject<HTMLInputElement | null>
  start_at: React.RefObject<HTMLInputElement | null>
  end_at: React.RefObject<HTMLInputElement | null>
  description: React.RefObject<HTMLTextAreaElement | null>
}

function refForField(
  name: keyof MeetupFormFields,
  refs: FieldRefMap,
):
  | React.RefObject<HTMLInputElement | null>
  | React.RefObject<HTMLTextAreaElement | null> {
  return refs[name]
}

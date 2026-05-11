'use client'

import { useActionState } from 'react'
import {
  submitOwnerPilotIntakeAction,
  type OwnerPilotIntakeState,
} from '@/app/owners/start/actions'

// Short, action-focused intake form for /owners/start. Captures the
// campground basics, three optional links (website, booking, review),
// city/state, and a six-box "what do you want RoadWave to help with"
// checklist. On submit the server action writes a row to
// campground_leads + emails hello@getroadwave.com with the structured
// detail.
//
// Intentionally NOT a Stripe-gated signup — this is a lead intake.
// The actual paid signup flow lives at /owner/signup and is reached
// after a human follows up.

const INTEREST_OPTIONS: { value: string; label: string }[] = [
  { value: 'more_google_reviews', label: 'More Google reviews' },
  { value: 'repeat_bookings', label: 'Repeat bookings' },
  { value: 'guest_updates', label: 'Guest updates' },
  { value: 'contact_office', label: 'Contact the office' },
  { value: 'private_stay_feedback', label: 'Private stay feedback' },
  { value: 'optional_camper_connection', label: 'Optional camper connection' },
]

const initialState: OwnerPilotIntakeState = { error: null, ok: false }

export function OwnerPilotForm() {
  const [state, formAction, pending] = useActionState(
    submitOwnerPilotIntakeAction,
    initialState,
  )

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] p-6 sm:p-8 text-center space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-leaf">
          Pilot intake received
        </p>
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          We&apos;ll be in touch.
        </h2>
        <p className="text-sm text-mist leading-relaxed max-w-md mx-auto">
          A real human will reply within one business day to walk you
          through setup, send your QR code, and answer anything specific
          to your campground.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campground name">
          <input
            name="campground_name"
            required
            maxLength={200}
            className={inputCls}
            placeholder="Pine Lake Campground"
          />
        </Field>
        <Field label="Your name">
          <input
            name="contact_name"
            required
            maxLength={200}
            className={inputCls}
            placeholder="Owner or manager"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            maxLength={320}
            className={inputCls}
            placeholder="you@campground.com"
          />
        </Field>
        <Field label="Phone (optional)">
          <input
            name="phone"
            type="tel"
            maxLength={60}
            className={inputCls}
            placeholder="—"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <input
            name="city"
            required
            maxLength={120}
            className={inputCls}
            placeholder="Asheville"
          />
        </Field>
        <Field label="State">
          <input
            name="state"
            required
            maxLength={120}
            className={inputCls}
            placeholder="NC"
          />
        </Field>
      </div>

      <Field
        label="Campground website (optional)"
        hint="Full https:// URL."
      >
        <input
          name="website"
          type="url"
          maxLength={300}
          className={inputCls}
          placeholder="https://"
        />
      </Field>

      <Field
        label="Booking / reservation link (optional)"
        hint="We can wire this to a Book Again button on your welcome page later."
      >
        <input
          name="booking_url"
          type="url"
          maxLength={300}
          className={inputCls}
          placeholder="https://"
        />
      </Field>

      <Field
        label="Google review link (optional)"
        hint="Used for the Leave a Google Review button on your welcome page."
      >
        <input
          name="review_url"
          type="url"
          maxLength={300}
          className={inputCls}
          placeholder="https://"
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-cream">
          What do you want RoadWave to help with?
        </legend>
        <p className="text-xs text-mist">
          Pick any that matter. You can change these later in the
          dashboard.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {INTEREST_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream cursor-pointer has-[:checked]:bg-leaf has-[:checked]:text-night has-[:checked]:border-leaf transition-colors"
            >
              <input
                type="checkbox"
                name="interests"
                value={o.value}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-leaf text-night px-6 py-3 text-base font-semibold shadow-lg shadow-leaf/20 hover:bg-leaf/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Sending…' : 'Create My Campground Pilot'}
      </button>

      <p className="text-center text-[11px] text-mist/80 leading-snug">
        A real human follows up within one business day. No card needed
        for the intake.
      </p>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-cream">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50'

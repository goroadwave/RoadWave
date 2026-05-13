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

type Props = {
  /** Which Stripe plans the deploy has price IDs for. Defaults to
   *  monthly-only — the annual radio is hidden until the env var is
   *  wired up so the form can't 302-fail on price_not_configured. */
  availablePlans?: ReadonlyArray<'monthly' | 'annual'>
}

export function OwnerPilotForm({ availablePlans = ['monthly'] }: Props) {
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

      {/* Plan picker. The set of radios is gated by what STRIPE_PRICE_ID_*
          env vars are configured on the server (passed down via
          `availablePlans`). When only one plan is configured we skip
          the visible picker entirely and submit that plan via a
          hidden input — no half-broken "pick annual and 302-fail to
          price_not_configured" path. */}
      {availablePlans.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-cream">
            Pick a billing cadence
          </legend>
          <p className="text-xs text-mist">
            30-day free trial on either plan. Cancel anytime from the
            owner billing tab.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 pt-1">
            {availablePlans.includes('monthly') && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 has-[:checked]:border-leaf has-[:checked]:bg-leaf/10 transition-colors">
                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  defaultChecked
                  className="mt-1 h-4 w-4 accent-leaf"
                />
                <span>
                  <span className="block text-sm font-semibold text-cream">
                    Monthly · Founding Pilot
                  </span>
                  <span className="block text-xs text-mist">
                    Simple monthly pricing. Cancel anytime.
                  </span>
                </span>
              </label>
            )}
            {availablePlans.includes('annual') && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 has-[:checked]:border-leaf has-[:checked]:bg-leaf/10 transition-colors">
                <input
                  type="radio"
                  name="plan"
                  value="annual"
                  defaultChecked={!availablePlans.includes('monthly')}
                  className="mt-1 h-4 w-4 accent-leaf"
                />
                <span>
                  <span className="block text-sm font-semibold text-cream">
                    Annual · Founding Pilot
                  </span>
                  <span className="block text-xs text-mist">
                    One yearly charge. Same cancel-anytime terms.
                  </span>
                </span>
              </label>
            )}
          </div>
        </fieldset>
      ) : (
        // Single plan available — submit it via a hidden input so the
        // server action's schema validates without a visible picker.
        <input type="hidden" name="plan" value={availablePlans[0] ?? 'monthly'} />
      )}

      {/* Legal acks. All four required — Stripe Checkout won't open
          until these are checked. Same shape as /owner/signup so the
          submission row carries the full audit trail. */}
      <fieldset className="space-y-2 rounded-2xl border border-flame/20 bg-flame/[0.04] p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-flame">
          Before we go to checkout
        </legend>
        <AckRow
          name="accepted_partner_terms"
          label={
            <>
              I agree to the{' '}
              <a
                href="/campground-partner-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame underline-offset-2 hover:underline"
              >
                Campground Partner Terms
              </a>{' '}
              and{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame underline-offset-2 hover:underline"
              >
                Terms of Service
              </a>
              .
            </>
          }
        />
        <AckRow
          name="ack_optional"
          label="RoadWave is optional for my guests — I won't require it as a condition of staying."
        />
        <AckRow
          name="ack_no_site_numbers"
          label="I understand RoadWave never displays exact campsite numbers to other guests."
        />
        <AckRow
          name="ack_not_emergency"
          label="RoadWave is not an emergency service. For emergencies, guests should call 911."
        />
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
        {pending ? 'Sending you to checkout…' : 'Continue to Secure Checkout →'}
      </button>

      <p className="text-center text-[11px] text-mist/80 leading-snug">
        Card on file via Stripe Checkout. Pilot is free for 30 days.
        After that, Founding Campground plans start at $39/month.
        Cancel anytime.
      </p>
    </form>
  )
}

function AckRow({
  name,
  label,
}: {
  name: string
  label: React.ReactNode
}) {
  return (
    <label className="flex items-start gap-3 px-2 py-1.5 text-sm text-cream cursor-pointer">
      <input
        type="checkbox"
        name={name}
        required
        className="mt-1 h-4 w-4 accent-flame"
      />
      <span className="leading-snug text-cream/90">{label}</span>
    </label>
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

'use client'

import { useActionState, useState } from 'react'
import {
  ownerSignupAction,
  type OwnerSignupState,
} from '@/app/owner/signup/actions'
import { OwnerSignupLogoUpload } from './owner-signup-logo-upload'

const INITIAL_STATE: OwnerSignupState = { error: null }

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'rv_park', label: 'RV Park' },
  { value: 'resort', label: 'Resort' },
  { value: 'state_park', label: 'State Park' },
  { value: 'private', label: 'Private Campground' },
  { value: 'seasonal', label: 'Seasonal Park' },
  { value: 'other', label: 'Other' },
]

const TARGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'overnight', label: 'Overnight guests' },
  { value: 'seasonal', label: 'Seasonal guests' },
  { value: 'events', label: 'Events' },
  { value: 'all', label: 'All guests' },
]

// Self-serve owner signup form. Captures the spec §2 fields, submits
// to ownerSignupAction (which persists owner_signup_submissions and
// redirects to Stripe Checkout). The four acknowledgement checkboxes
// are all required by the server action; this form mirrors them in
// local state so the submit button stays disabled until they're all
// checked.
export function OwnerSignupForm() {
  const [state, formAction, pending] = useActionState(
    ownerSignupAction,
    INITIAL_STATE,
  )

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly')

  const [partner, setPartner] = useState(false)
  const [optional, setOptional] = useState(false)
  const [noSites, setNoSites] = useState(false)
  const [notEmergency, setNotEmergency] = useState(false)
  const allAcks = partner && optional && noSites && notEmergency

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="rounded-2xl border border-flame/30 bg-flame/[0.05] p-3">
        <legend className="px-1 text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
          Plan
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={
              plan === 'monthly'
                ? 'flex flex-col gap-0.5 rounded-xl border-2 border-flame bg-flame/15 px-3 py-2.5 cursor-pointer'
                : 'flex flex-col gap-0.5 rounded-xl border border-white/10 bg-card px-3 py-2.5 cursor-pointer hover:border-flame/40'
            }
          >
            <input
              type="radio"
              name="plan"
              value="monthly"
              checked={plan === 'monthly'}
              onChange={() => setPlan('monthly')}
              className="sr-only"
            />
            <span className="text-sm font-semibold text-cream">Monthly</span>
            <span className="text-xs text-mist">$39 / month · cancel anytime</span>
          </label>
          <label
            className={
              plan === 'annual'
                ? 'flex flex-col gap-0.5 rounded-xl border-2 border-flame bg-flame/15 px-3 py-2.5 cursor-pointer'
                : 'flex flex-col gap-0.5 rounded-xl border border-white/10 bg-card px-3 py-2.5 cursor-pointer hover:border-flame/40'
            }
          >
            <input
              type="radio"
              name="plan"
              value="annual"
              checked={plan === 'annual'}
              onChange={() => setPlan('annual')}
              className="sr-only"
            />
            <span className="text-sm font-semibold text-cream">
              Annual <span className="text-flame">— save</span>
            </span>
            <span className="text-xs text-mist">$390 / year · 2 months free</span>
          </label>
        </div>
      </fieldset>

      <Field
        label="Campground name"
        name="campground_name"
        required
        autoComplete="organization"
      />
      <Field
        label="Owner or manager name"
        name="owner_name"
        required
        autoComplete="name"
      />
      <Field
        label="Email address"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <Field label="Phone number" name="phone" type="tel" autoComplete="tel" />
      <Field
        label="Campground website"
        name="website"
        placeholder="https://..."
        autoComplete="url"
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="City" name="city" autoComplete="address-level2" />
        <Field label="State" name="state" autoComplete="address-level1" />
      </div>

      <Field
        label="Number of campsites"
        name="num_sites"
        type="number"
        min={0}
      />

      <Select
        label="Type of campground"
        name="campground_type"
        options={TYPE_OPTIONS}
      />

      <YesNo label="Do you host activities or events?" name="hosts_events" />

      <Select
        label="Do you want RoadWave mainly for…"
        name="target_guests"
        options={TARGET_OPTIONS}
      />

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-flame font-semibold mb-1.5">
          Campground logo (optional)
        </label>
        <OwnerSignupLogoUpload value={logoUrl} onChange={setLogoUrl} />
        <input type="hidden" name="logo_url" value={logoUrl ?? ''} />
      </div>

      <YesNo label="Would you like a setup call?" name="wants_setup_call" />

      <fieldset className="rounded-2xl border border-flame/25 bg-flame/[0.04] p-3 space-y-2">
        <legend className="px-1 text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
          Required acknowledgements
        </legend>
        <Ack
          name="accepted_partner_terms"
          checked={partner}
          onChange={setPartner}
          label={
            <>
              I agree to the{' '}
              <a
                href="/campground-partner-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame underline-offset-2 hover:underline"
              >
                RoadWave Campground Partner Terms
              </a>
            </>
          }
        />
        <Ack
          name="ack_optional"
          checked={optional}
          onChange={setOptional}
          label="I understand RoadWave is optional for guests"
        />
        <Ack
          name="ack_no_site_numbers"
          checked={noSites}
          onChange={setNoSites}
          label="I understand guests should not be required to share exact site numbers"
        />
        <Ack
          name="ack_not_emergency"
          checked={notEmergency}
          onChange={setNotEmergency}
          label="I understand RoadWave is not an emergency service"
        />
      </fieldset>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !allAcks}
        className="w-full rounded-xl bg-flame text-night px-4 py-3 text-base font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Saving…' : 'Start My Campground Pilot'}
      </button>
      {!allAcks && (
        <p className="text-center text-[11px] text-mist/80 leading-snug">
          Check all four acknowledgements above to enable the button.
        </p>
      )}
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  autoComplete,
  min,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
  min?: number
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] text-flame font-semibold mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        className="w-full rounded-lg border border-white/10 bg-night/40 text-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
      />
    </label>
  )
}

function Select({
  label,
  name,
  options,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] text-flame font-semibold mb-1">
        {label}
      </span>
      <select
        name={name}
        defaultValue=""
        className="w-full rounded-lg border border-white/10 bg-night/40 text-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-night">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function YesNo({ label, name }: { label: string; name: string }) {
  return (
    <fieldset>
      <legend className="block text-[11px] uppercase tracking-[0.18em] text-flame font-semibold mb-1">
        {label}
      </legend>
      <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-card px-3 py-1.5 text-sm text-cream cursor-pointer">
        <input type="checkbox" name={name} className="accent-flame" />
        Yes
      </label>
    </fieldset>
  )
}

function Ack({
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
    <label className="flex items-start gap-2 text-sm text-cream cursor-pointer">
      <input
        type="checkbox"
        name={name}
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-flame"
      />
      <span>{label}</span>
    </label>
  )
}

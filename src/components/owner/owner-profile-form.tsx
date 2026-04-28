'use client'

import { useActionState } from 'react'
import {
  saveOwnerProfileAction,
  type ProfileSaveState,
} from '@/app/owner/(authed)/profile/actions'
import type { OwnerCampground } from '@/app/owner/(authed)/_helpers'
import { OwnerLogoUpload } from '@/components/owner/owner-logo-upload'

const AMENITIES: { slug: string; label: string }[] = [
  { slug: 'full_hookups', label: 'Full hookups' },
  { slug: 'water_electric', label: 'Water/Electric' },
  { slug: 'tent_sites', label: 'Tent sites' },
  { slug: 'wifi', label: 'WiFi' },
  { slug: 'pool', label: 'Pool' },
  { slug: 'dog_friendly', label: 'Dog-friendly' },
  { slug: 'laundry', label: 'Laundry' },
  { slug: 'store', label: 'Store' },
  { slug: 'restrooms', label: 'Restrooms' },
  { slug: 'showers', label: 'Showers' },
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

const initialState: ProfileSaveState = { error: null, ok: false }

export function OwnerProfileForm({ campground }: { campground: OwnerCampground }) {
  const [state, formAction, pending] = useActionState(
    saveOwnerProfileAction,
    initialState,
  )
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="campground_id" value={campground.id} />

      <Field label="Campground name">
        <input
          name="name"
          required
          defaultValue={campground.name}
          maxLength={120}
          className={inputCls}
        />
      </Field>
      <Field label="Address">
        <input
          name="address"
          defaultValue={campground.address ?? ''}
          maxLength={300}
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Phone">
          <input
            name="phone"
            type="tel"
            defaultValue={campground.phone ?? ''}
            maxLength={60}
            className={inputCls}
          />
        </Field>
        <Field label="Website">
          <input
            name="website"
            type="url"
            defaultValue={campground.website ?? ''}
            maxLength={300}
            placeholder="https://"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Logo is uploaded via its own widget (writes to Storage + persists
          the public URL directly). The hidden input below keeps the URL in
          the main save action, so any in-flight Replace-logo upload that
          completed since the form mounted still wins on Save. */}
      <input
        type="hidden"
        name="logo_url"
        defaultValue={campground.logo_url ?? ''}
      />
      <OwnerLogoUpload
        campgroundId={campground.id}
        currentLogoUrl={campground.logo_url}
      />

      <Field label="Timezone">
        <select
          name="timezone"
          defaultValue={campground.timezone}
          className={inputCls}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz} className="bg-night text-cream">
              {tz}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium text-cream">Amenities</p>
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES.map((a) => {
            const checked = campground.amenities.includes(a.slug)
            return (
              <label
                key={a.slug}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream cursor-pointer has-[:checked]:bg-flame has-[:checked]:text-night has-[:checked]:border-flame"
              >
                <input
                  type="checkbox"
                  name="amenities"
                  value={a.slug}
                  defaultChecked={checked}
                  className="sr-only"
                />
                {a.label}
              </label>
            )
          })}
        </div>
      </div>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-leaf/30 bg-leaf/10 p-2 text-sm text-leaf">
          Saved.
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
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
      <label className="mb-1 block text-sm font-medium text-cream">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryBtn =
  'rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 transition-colors'

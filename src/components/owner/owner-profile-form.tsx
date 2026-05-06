'use client'

import { useMemo, useRef, useState, useActionState } from 'react'
import {
  saveOwnerProfileAction,
  type ProfileSaveState,
} from '@/app/owner/(authed)/profile/actions'
import type { OwnerCampground } from '@/app/owner/(authed)/_helpers'
import { OwnerLogoUpload } from '@/components/owner/owner-logo-upload'
import {
  AMENITY_GROUPS,
  MAX_CUSTOM_AMENITIES,
  MAX_CUSTOM_AMENITY_CHARS,
  splitAmenities,
} from '@/lib/campgrounds/amenities'

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

  // Split saved amenities into standard (will be reflected in
  // checkboxes) and custom (rendered as removable tags + a fresh
  // input). Memo so we don't recompute every render.
  const initial = useMemo(
    () => splitAmenities(campground.amenities),
    [campground.amenities],
  )
  const [customAmenities, setCustomAmenities] = useState<string[]>(
    initial.custom,
  )
  const [customDraft, setCustomDraft] = useState('')
  const draftInputRef = useRef<HTMLInputElement>(null)

  const atCustomLimit = customAmenities.length >= MAX_CUSTOM_AMENITIES

  function addCustom() {
    const trimmed = customDraft.trim().slice(0, MAX_CUSTOM_AMENITY_CHARS)
    if (!trimmed) return
    if (atCustomLimit) return
    // Dedupe — case-insensitive against both standards and existing customs.
    const lower = trimmed.toLowerCase()
    const collidesWithCustom = customAmenities.some(
      (c) => c.toLowerCase() === lower,
    )
    if (collidesWithCustom) {
      // Already added — just clear the draft so the visual cue is "the
      // empty input is back, ready for another."
      setCustomDraft('')
      draftInputRef.current?.focus()
      return
    }
    setCustomAmenities((prev) => [...prev, trimmed])
    setCustomDraft('')
    // Focus the (now-empty) input so the owner can keep typing — the
    // spec calls for "a new empty input field automatically appears."
    requestAnimationFrame(() => draftInputRef.current?.focus())
  }

  function removeCustom(idx: number) {
    setCustomAmenities((prev) => prev.filter((_, i) => i !== idx))
  }

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

      <div className="space-y-4">
        <p className="text-sm font-medium text-cream">Amenities</p>

        {/* Standard amenities — grouped, one checkbox per amenity. The
            saved value IS the label (e.g. "Heated Pool"); the new
            renderers and the migrated DB rows align on labels not slugs. */}
        {AMENITY_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-flame font-semibold">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.amenities.map((label) => {
                const checked = initial.standard.includes(label)
                return (
                  <label
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream cursor-pointer has-[:checked]:bg-flame has-[:checked]:text-night has-[:checked]:border-flame transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={label}
                      defaultChecked={checked}
                      className="sr-only"
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </div>
        ))}

        {/* Custom amenities — owner-typed free text. Each saved as its
            own hidden input with name="amenities" so the server action's
            formData.getAll('amenities') picks them up alongside the
            checked standards. Visually distinguished by a dashed border
            (matches the welcome-page render style). */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-flame font-semibold">
            Other Amenities — Add Your Own
          </p>
          <p className="text-xs text-mist leading-snug">
            Anything we don&rsquo;t list above. Up to{' '}
            {MAX_CUSTOM_AMENITIES} total.
          </p>

          {/* Existing custom amenities (removable tags) */}
          {customAmenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customAmenities.map((amenity, idx) => (
                <span
                  key={`${amenity}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-flame/50 bg-transparent px-3 py-1.5 text-xs text-flame"
                >
                  {amenity}
                  <button
                    type="button"
                    onClick={() => removeCustom(idx)}
                    aria-label={`Remove ${amenity}`}
                    className="grid h-4 w-4 place-items-center rounded-full text-flame hover:bg-flame/15 transition-colors"
                  >
                    <span aria-hidden className="text-xs leading-none">
                      ✕
                    </span>
                  </button>
                  {/* Hidden form field — submits this custom amenity
                      to the server action under the same `amenities`
                      name as the standard checkboxes. */}
                  <input type="hidden" name="amenities" value={amenity} />
                </span>
              ))}
            </div>
          )}

          {/* Input row — always visible. Per spec the field clears
              after Add so the owner sees "a new empty field appeared."
              Disabled when the cap is reached. */}
          <div className="flex gap-2 pt-1">
            <input
              ref={draftInputRef}
              type="text"
              value={customDraft}
              onChange={(e) => setCustomDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustom()
                }
              }}
              maxLength={MAX_CUSTOM_AMENITY_CHARS}
              disabled={atCustomLimit}
              placeholder="e.g. Pool Tables, Horseback Riding, Arcade..."
              className={inputCls}
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customDraft.trim() || atCustomLimit}
              className="shrink-0 rounded-lg border border-flame/40 bg-flame/10 text-flame px-4 py-2 text-sm font-semibold hover:bg-flame/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
          {atCustomLimit && (
            <p className="text-[11px] text-mist/80">
              You&rsquo;ve added the maximum {MAX_CUSTOM_AMENITIES} custom
              amenities. Remove one to add another.
            </p>
          )}
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
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50'

const primaryBtn =
  'rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 transition-colors'

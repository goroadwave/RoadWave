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
  MAX_AMENITY_NOTE_CHARS,
  MAX_CUSTOM_AMENITIES,
  MAX_CUSTOM_AMENITY_CHARS,
  splitAmenities,
} from '@/lib/campgrounds/amenities'

const NOTE_MAX_CHARS = MAX_AMENITY_NOTE_CHARS

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
  // Standard amenity selection is controlled (vs the previous
  // uncontrolled `defaultChecked`) so the Notes panel below knows which
  // amenities are currently active and only renders note inputs for those.
  // Unchecking an amenity also drops its note from the serialized payload
  // — see `serializedNotes` below.
  const [selectedStandard, setSelectedStandard] = useState<Set<string>>(
    () => new Set(initial.standard),
  )
  const [customAmenities, setCustomAmenities] = useState<string[]>(
    initial.custom,
  )
  const [customDraft, setCustomDraft] = useState('')
  const draftInputRef = useRef<HTMLInputElement>(null)

  // Per-amenity notes the owner wants shown under each amenity card on
  // the Updates Only page. Keyed by amenity label. Empty / whitespace-only
  // notes get pruned at save time so the column stays tidy.
  const [notes, setNotes] = useState<Record<string, string>>(
    () => ({ ...(campground.amenity_notes ?? {}) }),
  )

  const atCustomLimit = customAmenities.length >= MAX_CUSTOM_AMENITIES

  function toggleStandard(label: string) {
    setSelectedStandard((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  // Active amenities = selected standards (in canonical group order, so
  // the Notes panel matches the order of the checkbox grid) followed by
  // custom amenities in the order the owner added them.
  const activeAmenities = useMemo(() => {
    const ordered: string[] = []
    for (const group of AMENITY_GROUPS) {
      for (const label of group.amenities) {
        if (selectedStandard.has(label)) ordered.push(label)
      }
    }
    return [...ordered, ...customAmenities]
  }, [selectedStandard, customAmenities])

  // The hidden form field. Only includes notes for currently-active
  // amenities, and only those with non-empty content. The server action
  // re-prunes against the saved amenities array as a belt-and-braces.
  const serializedNotes = useMemo(() => {
    const out: Record<string, string> = {}
    for (const label of activeAmenities) {
      const note = notes[label]?.trim()
      if (note) out[label] = note
    }
    return JSON.stringify(out)
  }, [activeAmenities, notes])

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

      {/* Guest-facing links that surface as CTAs on the welcome page
          after a guest scans the QR. Clicks are logged to
          campground_events and roll into the dashboard's "This Week"
          card + the Monday weekly report email. */}
      <div className="rounded-2xl border border-flame/20 bg-flame/[0.04] p-4 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
          Guest CTAs (optional)
        </p>
        <p className="text-xs text-mist leading-snug">
          Show a Leave a Review or Book Again button on your welcome
          page. We track taps so you can see them in your weekly report.
        </p>
        <Field
          label="Google Review URL"
          hint="The Google Maps review link for your campground."
        >
          <input
            name="google_review_url"
            type="url"
            defaultValue={campground.google_review_url ?? ''}
            maxLength={500}
            placeholder="https://g.page/r/..."
            className={inputCls}
          />
        </Field>
        <Field
          label="Book Again URL"
          hint="Direct link to your reservation page, Airbnb listing, etc."
        >
          <input
            name="booking_url"
            type="url"
            defaultValue={campground.booking_url ?? ''}
            maxLength={500}
            placeholder="https://"
            className={inputCls}
          />
        </Field>
        <Field
          label="Booking message (optional)"
          hint="A short note shown above the Book Again button — e.g. dates, what's new, what's included."
        >
          <textarea
            name="booking_message"
            defaultValue={campground.booking_message ?? ''}
            maxLength={500}
            rows={2}
            placeholder="Hope to see you again this fall — fire pits are back!"
            className={inputCls + ' resize-none'}
          />
        </Field>
        <Field
          label="Promo code (optional)"
          hint="Shown next to the Booking message. Leave blank if none."
        >
          <input
            name="booking_promo_code"
            type="text"
            defaultValue={campground.booking_promo_code ?? ''}
            maxLength={60}
            placeholder="RETURN10"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Park Map (mig 0048). URL-only this phase — owner pastes any
          public URL (Google Drive, hosted PDF, Imgur, the park's own
          website map). The public guest hub renders the card only
          when the toggle is on AND a URL is present. */}
      <div className="rounded-2xl border border-leaf/20 bg-leaf/[0.04] p-4 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-leaf font-semibold">
          Park Map (optional)
        </p>
        <p className="text-xs text-mist leading-snug">
          Link out to a map of your campground. Paste any public URL —
          Google Drive, an image hosted anywhere, a PDF, or the map
          page on your own website. Opens in a new tab on the guest
          hub. File upload is coming later; for now a public link is
          all that&apos;s needed.
        </p>
        <label className="flex items-start gap-2 text-sm text-cream cursor-pointer">
          <input
            type="checkbox"
            name="show_park_map"
            defaultChecked={campground.show_park_map}
            className="mt-1 h-4 w-4 accent-leaf"
          />
          <span>
            Show the Park Map card on my guest hub
            <span className="block text-xs text-mist mt-0.5">
              The card stays hidden until you also paste a URL below.
            </span>
          </span>
        </label>
        <Field
          label="Park Map URL"
          hint="Public link a guest can open. https:// required."
        >
          <input
            name="park_map_url"
            type="url"
            defaultValue={campground.park_map_url ?? ''}
            maxLength={500}
            placeholder="https://drive.google.com/file/d/.../view"
            className={inputCls}
          />
        </Field>
        <Field
          label="Map caption (optional)"
          hint="A short line under the map link — e.g. 'Loop B closures highlighted in red.'"
        >
          <textarea
            name="park_map_notes"
            defaultValue={campground.park_map_notes ?? ''}
            maxLength={500}
            rows={2}
            placeholder="Sites 1–40 in the Birch loop. Sites 41–80 in the Cedar loop."
            className={inputCls + ' resize-none'}
          />
        </Field>
      </div>

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
        <div className="space-y-1">
          <p className="text-sm font-medium text-cream">Guest Page Amenities</p>
          <p className="text-xs text-mist leading-snug">
            Shown to campers on the &ldquo;Just See Campground Updates&rdquo;
            page. Toggle the amenities your campground offers, add custom
            ones below, and add an optional note for each (e.g. hours,
            location, password) so guests know what to expect.
          </p>
        </div>

        {/* Standard amenities — grouped, one checkbox per amenity. The
            saved value IS the label (e.g. "Heated Pool"); the new
            renderers and the migrated DB rows align on labels not slugs.
            Selection is controlled so the Notes panel can reflect the
            current set. */}
        {AMENITY_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-flame font-semibold">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.amenities.map((label) => {
                const checked = selectedStandard.has(label)
                return (
                  <label
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cream cursor-pointer has-[:checked]:bg-flame has-[:checked]:text-night has-[:checked]:border-flame transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="amenities"
                      value={label}
                      checked={checked}
                      onChange={() => toggleStandard(label)}
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

        {/* Notes for active amenities — one input per active amenity.
            Optional: blanks are pruned at save. Shown as a collapsible
            <details> so the form stays compact for owners who don't want
            to add notes. Auto-opens when at least one amenity already
            has a note so an owner editing their profile can see what
            they have. */}
        {activeAmenities.length > 0 && (
          <details
            className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 group"
            open={Object.values(notes).some((v) => v?.trim().length > 0)}
          >
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-flame font-semibold">
                  Notes for your amenities (optional)
                </p>
                <p className="text-xs text-mist leading-snug">
                  Add a short note per amenity — hours, location, Wi-Fi
                  password, etc. Leave blank if no note is needed.
                </p>
              </div>
              <span
                aria-hidden
                className="text-mist text-xs group-open:hidden"
              >
                Show
              </span>
              <span
                aria-hidden
                className="text-mist text-xs hidden group-open:inline"
              >
                Hide
              </span>
            </summary>
            <div className="pt-3 space-y-2">
              {activeAmenities.map((label) => (
                <div key={`note-${label}`} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-cream/90">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={notes[label] ?? ''}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [label]: e.target.value,
                      }))
                    }
                    maxLength={NOTE_MAX_CHARS}
                    placeholder="e.g. Open 8 AM–10 PM, Password at office"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Hidden form payload: serialized notes for active amenities
            with non-empty values. The server action zod-parses this,
            re-prunes against the persisted amenities array, and saves
            into campgrounds.amenity_notes (migration 0045). */}
        <input
          type="hidden"
          name="amenity_notes_json"
          value={serializedNotes}
        />
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

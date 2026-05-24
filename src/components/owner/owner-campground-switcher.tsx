'use client'

import type { OwnerMembership } from '@/app/owner/(authed)/_helpers'
import { selectOwnerCampgroundAction } from '@/app/owner/(authed)/select-campground-action'

// Header-strip switcher for owners who manage more than one
// campground. Renders nothing useful when membership count is 0
// (handled by the layout's redirect to /owner/setup); renders a
// static label when count is 1; renders a <select> that auto-
// submits on change when count is > 1.
//
// Client component because the auto-submit-on-change interaction
// needs a JS event handler. The actual mutation runs server-side
// via selectOwnerCampgroundAction, which validates the chosen
// campground_id against campground_admins before writing the
// owner_cg cookie + revalidating the owner shell.
//
// Why not a regular <a href> list per campground: a dropdown stays
// out of the way in the header strip and works on narrow mobile
// viewports without consuming a row of nav real estate.

export function OwnerCampgroundSwitcher({
  memberships,
  currentCampgroundId,
}: {
  memberships: OwnerMembership[]
  currentCampgroundId: string | null
}) {
  if (memberships.length === 0) return null

  const current = memberships.find(
    (m) => m.campground_id === currentCampgroundId,
  )
  const currentName = current?.name ?? 'Unknown campground'

  // Solo owner: static label so they always know which campground
  // they're viewing, but no picker (nothing to pick).
  if (memberships.length === 1) {
    return (
      <div className="text-[11px] text-mist whitespace-nowrap">
        Viewing:{' '}
        <span className="text-cream font-medium">{currentName}</span>
      </div>
    )
  }

  return (
    <form
      action={selectOwnerCampgroundAction}
      className="flex items-center gap-1.5 min-w-0"
    >
      <span className="text-[11px] text-mist whitespace-nowrap shrink-0">
        Viewing:
      </span>
      <label className="sr-only" htmlFor="owner-cg-switcher">
        Active campground
      </label>
      <select
        id="owner-cg-switcher"
        name="campground_id"
        defaultValue={currentCampgroundId ?? ''}
        onChange={(e) => {
          // One-tap switch on mobile: submit the form as soon as the
          // owner picks a new campground. requestSubmit() invokes
          // the server action (form-level `action` prop) the same
          // way a click on a submit button would.
          e.currentTarget.form?.requestSubmit()
        }}
        className="min-w-0 rounded-md border border-white/10 bg-white/[0.03] text-cream text-[11px] px-2 py-1 max-w-[180px] sm:max-w-[260px] truncate"
      >
        {memberships.map((m) => (
          <option key={m.campground_id} value={m.campground_id}>
            {m.name}
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          className="text-[11px] text-flame underline-offset-2 hover:underline"
        >
          Switch
        </button>
      </noscript>
    </form>
  )
}

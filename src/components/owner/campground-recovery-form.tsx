'use client'

import { useActionState } from 'react'
import {
  provisionCampgroundAction,
  type ProvisionState,
} from '@/app/owner/(authed)/profile/provision-actions'

const initialState: ProvisionState = { error: null }

// Shown on /owner/profile when the user has no campground linked yet.
// Provisions the campground row + campground_admins link + QR token in
// one go so a half-finished signup can complete itself.
export function CampgroundRecoveryForm() {
  const [state, formAction, pending] = useActionState(
    provisionCampgroundAction,
    initialState,
  )
  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border-2 border-dashed border-flame/50 bg-flame/[0.04] p-5"
    >
      <div className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
          Finish setup
        </p>
        <h2 className="font-display text-xl font-extrabold text-cream leading-tight">
          We don&apos;t see a campground linked to your account yet.
        </h2>
        <p className="text-xs text-mist leading-snug">
          Enter your campground name below and we&apos;ll provision your page,
          QR code, and dashboard. You can edit everything else after.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-cream">
          Campground name
        </label>
        <input
          name="campground_name"
          required
          maxLength={120}
          placeholder="Oak Hollow RV Resort"
          className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Creating…' : 'Create my campground'}
      </button>
    </form>
  )
}

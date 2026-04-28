'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  provisionCampgroundAction,
  type ProvisionState,
} from '@/app/owner/(authed)/profile/provision-actions'

const initialState: ProvisionState = {
  ok: false,
  error: null,
  campgroundId: null,
}

// Manual recovery card. Does NOT use useActionState because the redirect
// pattern there was making it look like nothing was happening on success.
// Instead we call the server action directly via useTransition, console
// log every step, and surface errors + success states explicitly.
export function CampgroundRecoveryForm() {
  const router = useRouter()
  const [state, setState] = useState<ProvisionState>(initialState)
  const [isPending, startTransition] = useTransition()

  // After a successful provision, refresh so /owner/profile re-runs
  // loadOwnerCampground() and finds the new row → renders the regular
  // editor instead of this recovery form.
  useEffect(() => {
    if (state.ok) {
      console.log(
        '[recovery-form] success → refreshing route to load the new profile',
      )
      router.refresh()
    }
  }, [state.ok, router])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    console.log(
      '[recovery-form] submit fired, campground_name:',
      formData.get('campground_name'),
    )
    setState({ ...initialState })

    startTransition(async () => {
      try {
        console.log('[recovery-form] calling provisionCampgroundAction…')
        const result = await provisionCampgroundAction(initialState, formData)
        console.log('[recovery-form] action returned:', result)
        setState(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        console.error('[recovery-form] action threw:', err)
        setState({ ok: false, error: msg, campgroundId: null })
      }
    })
  }

  if (state.ok) {
    return (
      <div className="rounded-2xl border-2 border-leaf/40 bg-leaf/[0.06] p-5 text-center space-y-2">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <p className="font-display text-xl font-extrabold text-cream">
          Campground created.
        </p>
        <p className="text-xs text-mist">Loading your profile…</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
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
          disabled={isPending}
          className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50"
        />
      </div>

      {state.error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-left">
          <p className="text-sm font-semibold text-red-300">
            Couldn&apos;t create your campground
          </p>
          <p className="mt-1 text-xs text-red-200/80 break-words">
            {state.error}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Creating…' : 'Create my campground'}
      </button>
    </form>
  )
}

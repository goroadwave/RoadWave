'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { checkInAction, type CheckInState } from '@/app/(app)/checkin/actions'
import { Eyebrow } from '@/components/ui/eyebrow'

const initialState: CheckInState = { error: null }

type Props = {
  token: string
  preview: {
    campground_id: string
    campground_name: string
    city: string | null
    region: string | null
  }
}

export function ConfirmCheckIn({ token, preview }: Props) {
  const [state, formAction, pending] = useActionState(checkInAction, initialState)
  const location = [preview.city, preview.region].filter(Boolean).join(', ')

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-flame/30 bg-flame/10 p-5"
    >
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1">
        <Eyebrow>Check in to</Eyebrow>
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
          {preview.campground_name}
        </h2>
        {location && <p className="text-sm text-mist">{location}</p>}
      </div>
      <p className="font-serif italic text-flame text-base sm:text-lg leading-snug">
        24 hours. Then you&apos;re invisible again.
      </p>
      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? (
            'Checking in…'
          ) : (
            <>
              Check in <span aria-hidden>👋</span>
            </>
          )}
        </button>
        <Link
          href="/checkin"
          className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-cream hover:bg-white/5 text-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

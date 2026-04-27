'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { checkOutAction, type CheckInState } from '@/app/(app)/checkin/actions'

type CheckIn = {
  id: string
  checked_in_at: string
  expires_at: string
  campground_id: string
  campground: { id: string; name: string; city: string | null; region: string | null } | null
}

const initialState: CheckInState = { error: null }

export function ActiveCheckIns({ checkIns }: { checkIns: CheckIn[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-mist">
        You&apos;re currently checked in
      </h2>
      <ul className="space-y-2">
        {checkIns.map((c) => (
          <ActiveRow key={c.id} checkIn={c} />
        ))}
      </ul>
    </section>
  )
}

function ActiveRow({ checkIn }: { checkIn: CheckIn }) {
  const [state, action, pending] = useActionState(checkOutAction, initialState)
  const expiresIn = formatDistanceToNow(new Date(checkIn.expires_at), { addSuffix: false })
  const location = checkIn.campground
    ? [checkIn.campground.city, checkIn.campground.region].filter(Boolean).join(', ')
    : ''

  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/5 bg-card p-3">
      <div>
        <p className="font-semibold text-cream">
          {checkIn.campground?.name ?? 'Unknown campground'}
        </p>
        {location && <p className="text-xs text-mist">{location}</p>}
        <p className="mt-1 text-xs text-mist">Expires in {expiresIn}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/nearby"
          className="text-sm font-semibold text-flame underline-offset-2 hover:underline"
        >
          See nearby
        </Link>
        <form action={action}>
          <input type="hidden" name="id" value={checkIn.id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm text-cream hover:bg-white/5 disabled:opacity-50"
          >
            {pending ? 'Checking out…' : 'Check out'}
          </button>
        </form>
      </div>
      {state.error && (
        <p className="text-xs text-red-300 sm:basis-full">{state.error}</p>
      )}
    </li>
  )
}

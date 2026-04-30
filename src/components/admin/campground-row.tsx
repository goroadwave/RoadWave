'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StatusPill } from './status-pill'
import { toggleCampgroundActiveAction } from '@/app/admin/campgrounds/actions'

type Props = {
  row: {
    id: string
    name: string
    city: string | null
    region: string | null
    is_active: boolean
    created_at: string
    bulletin_count: number
  }
}

export function CampgroundRow({ row }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleCampgroundActiveAction(row.id, !row.is_active)
      if (!result.ok) {
        setError(result.error ?? 'Could not update.')
        return
      }
      // Server cache is invalidated by revalidatePath in the action;
      // router.refresh() pulls the fresh server-rendered tree so the
      // pill + button label flip to reflect the new state.
      router.refresh()
    })
  }

  const place = [row.city, row.region].filter(Boolean).join(', ')

  return (
    <article className="rounded-2xl border border-white/5 bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cream truncate">{row.name}</p>
          {place && (
            <p className="text-[11px] text-mist truncate">{place}</p>
          )}
          <p className="text-[10px] text-mist/70 mt-0.5">
            Added {new Date(row.created_at).toLocaleDateString()} ·{' '}
            {row.bulletin_count} bulletin
            {row.bulletin_count === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill
            label={row.is_active ? 'Active' : 'Inactive'}
            tone={row.is_active ? 'active' : 'inactive'}
          />
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="rounded-md border border-white/10 bg-white/5 text-cream text-xs px-2 py-1 hover:border-flame/40 disabled:opacity-50"
          >
            {pending ? 'Saving…' : row.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
          {error}
        </p>
      )}
    </article>
  )
}

'use client'

import { useTransition } from 'react'
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
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await toggleCampgroundActiveAction(row.id, !row.is_active)
    })
  }

  const place = [row.city, row.region].filter(Boolean).join(', ')

  return (
    <article className="rounded-2xl border border-white/5 bg-card p-3 flex items-center justify-between gap-3">
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
    </article>
  )
}

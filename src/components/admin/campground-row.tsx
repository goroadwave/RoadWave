'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { StatusPill } from './status-pill'
import {
  extendCampgroundTrialAction,
  toggleCampgroundActiveAction,
} from '@/app/admin/campgrounds/actions'

type Props = {
  row: {
    id: string
    name: string
    city: string | null
    region: string | null
    is_active: boolean
    created_at: string
    bulletin_count: number
    subscription_status: 'trial' | 'active' | 'past_due' | 'canceled'
    plan: 'monthly' | 'annual' | null
    trial_ends_at: string | null
    days_to_expiry: number | null
    expiring_soon: boolean
  }
}

const SUB_LABEL: Record<Props['row']['subscription_status'], string> = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
}

// Map subscription_status to the existing StatusPill tones. 'trial'
// maps to 'open' which uses the flame palette — visually consistent
// with the eyebrow color used elsewhere in the admin UI.
const SUB_TONE: Record<
  Props['row']['subscription_status'],
  'open' | 'active' | 'review' | 'inactive'
> = {
  trial: 'open',
  active: 'active',
  past_due: 'review',
  canceled: 'inactive',
}

export function CampgroundRow({ row }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [extending, startExtend] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleCampgroundActiveAction(row.id, !row.is_active)
      if (!result.ok) {
        setError(result.error ?? 'Could not update.')
        return
      }
      router.refresh()
    })
  }

  function extend(days: number) {
    setError(null)
    startExtend(async () => {
      const result = await extendCampgroundTrialAction(row.id, days)
      if (!result.ok) {
        setError(result.error ?? 'Could not extend trial.')
        return
      }
      router.refresh()
    })
  }

  const place = [row.city, row.region].filter(Boolean).join(', ')
  const trialEndLabel = row.trial_ends_at
    ? new Date(row.trial_ends_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <article
      className={
        row.expiring_soon
          ? 'rounded-2xl border border-amber-400/40 bg-amber-400/[0.05] p-3 space-y-2'
          : 'rounded-2xl border border-white/5 bg-card p-3 space-y-2'
      }
    >
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
            {trialEndLabel && row.subscription_status === 'trial' && (
              <>
                {' · trial ends '}
                <span className={row.expiring_soon ? 'text-amber-300 font-semibold' : 'text-cream'}>
                  {trialEndLabel}
                  {row.days_to_expiry !== null
                    ? ` (${row.days_to_expiry}d)`
                    : ''}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <StatusPill
              label={SUB_LABEL[row.subscription_status]}
              tone={SUB_TONE[row.subscription_status]}
            />
            <StatusPill
              label={row.is_active ? 'Live' : 'Off'}
              tone={row.is_active ? 'active' : 'inactive'}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => extend(7)}
              disabled={extending}
              className="rounded-md border border-white/10 bg-white/5 text-cream text-[11px] px-2 py-1 hover:border-flame/40 disabled:opacity-50"
            >
              {extending ? '…' : '+7d'}
            </button>
            <button
              type="button"
              onClick={() => extend(30)}
              disabled={extending}
              className="rounded-md border border-white/10 bg-white/5 text-cream text-[11px] px-2 py-1 hover:border-flame/40 disabled:opacity-50"
            >
              +30d
            </button>
            <button
              type="button"
              onClick={toggle}
              disabled={pending}
              className="rounded-md border border-white/10 bg-white/5 text-cream text-[11px] px-2 py-1 hover:border-flame/40 disabled:opacity-50"
            >
              {pending ? '…' : row.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
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

'use client'

import { StatusPill } from './status-pill'
import { StatusSelect } from './status-select'
import {
  updateLeadStatusAction,
  updateRequestStatusAction,
} from '@/app/admin/inbox/actions'

const STATUSES = ['new', 'read', 'replied', 'flagged'] as const
type Status = (typeof STATUSES)[number]

const PILL_TONE: Record<Status, 'new' | 'read' | 'replied' | 'flagged'> = {
  new: 'new',
  read: 'read',
  replied: 'replied',
  flagged: 'flagged',
}

type Common = {
  id: string
  email: string
  campground_name: string | null
  created_at: string
  status: Status
}

export function LeadRow({ row }: { row: Common & { name: string | null } }) {
  return (
    <Row
      row={row}
      title={row.name ?? '—'}
      onChange={(next) => updateLeadStatusAction(row.id, next)}
    />
  )
}

export function RequestRow({ row }: { row: Common }) {
  return (
    <Row
      row={row}
      title={row.campground_name ?? '—'}
      onChange={(next) => updateRequestStatusAction(row.id, next)}
    />
  )
}

function Row({
  row,
  title,
  onChange,
}: {
  row: Common
  title: string
  onChange: (next: Status) => Promise<{ ok: boolean; error: string | null }>
}) {
  return (
    <article className="rounded-2xl border border-white/5 bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cream truncate">{title}</p>
          <p className="text-[11px] text-mist truncate">{row.email}</p>
          {row.campground_name && (
            <p className="text-[11px] text-mist truncate">
              {row.campground_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill label={row.status} tone={PILL_TONE[row.status]} />
          <StatusSelect<Status>
            value={row.status}
            options={STATUSES}
            onChange={onChange}
          />
        </div>
      </div>
      <p className="text-[10px] text-mist/70">
        {new Date(row.created_at).toLocaleString()}
      </p>
    </article>
  )
}

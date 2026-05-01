'use client'

import { StatusPill } from './status-pill'
import { StatusSelect } from './status-select'
import {
  updateLeadStatusAction,
  updateOwnerSubmissionStatusAction,
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

const SUBMISSION_STATUSES = ['new', 'paid', 'abandoned', 'provisioned'] as const
type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]
const SUBMISSION_PILL_TONE: Record<
  SubmissionStatus,
  'new' | 'replied' | 'inactive' | 'active'
> = {
  new: 'new',
  paid: 'replied',
  abandoned: 'inactive',
  provisioned: 'active',
}
const SUBMISSION_LABELS: Record<SubmissionStatus, string> = {
  new: 'new',
  paid: 'paid',
  abandoned: 'abandoned',
  provisioned: 'provisioned',
}

type SubmissionRowData = {
  id: string
  campground_name: string
  owner_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  num_sites: number | null
  campground_type: string | null
  hosts_events: boolean
  target_guests: string | null
  wants_setup_call: boolean
  status: SubmissionStatus
  created_at: string
  campground_id: string | null
}

export function OwnerSubmissionRow({ row }: { row: SubmissionRowData }) {
  const place = [row.city, row.state].filter(Boolean).join(', ')
  const detail: string[] = []
  if (row.num_sites !== null) detail.push(`${row.num_sites} sites`)
  if (row.campground_type) detail.push(prettyType(row.campground_type))
  if (row.target_guests) detail.push(`for ${row.target_guests} guests`)
  if (row.hosts_events) detail.push('events')
  if (row.wants_setup_call) detail.push('wants setup call')

  return (
    <article className="rounded-2xl border border-white/5 bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cream truncate">
            {row.campground_name}
          </p>
          <p className="text-[11px] text-mist truncate">
            {row.owner_name} · {row.email}
            {row.phone ? ` · ${row.phone}` : ''}
          </p>
          {place && (
            <p className="text-[11px] text-mist truncate">{place}</p>
          )}
          {detail.length > 0 && (
            <p className="text-[10px] text-mist/70 mt-0.5">
              {detail.join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill
            label={SUBMISSION_LABELS[row.status]}
            tone={SUBMISSION_PILL_TONE[row.status]}
          />
          <StatusSelect<SubmissionStatus>
            value={row.status}
            options={SUBMISSION_STATUSES}
            labels={SUBMISSION_LABELS}
            onChange={(next) =>
              updateOwnerSubmissionStatusAction(row.id, next)
            }
          />
        </div>
      </div>
      <p className="text-[10px] text-mist/70">
        {new Date(row.created_at).toLocaleString()}
      </p>
    </article>
  )
}

function prettyType(slug: string): string {
  switch (slug) {
    case 'rv_park':
      return 'RV Park'
    case 'state_park':
      return 'State Park'
    case 'private':
      return 'Private campground'
    case 'seasonal':
      return 'Seasonal park'
    default:
      return slug.replace(/_/g, ' ')
  }
}

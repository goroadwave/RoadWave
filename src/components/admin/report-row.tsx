'use client'

import { StatusPill } from './status-pill'
import { StatusSelect } from './status-select'
import { updateReportStatusAction } from '@/app/admin/safety/actions'

const STATUSES = ['open', 'under_review', 'actioned', 'dismissed'] as const
type Status = (typeof STATUSES)[number]

const PILL_TONE: Record<Status, 'open' | 'review' | 'resolved'> = {
  open: 'open',
  under_review: 'review',
  actioned: 'resolved',
  dismissed: 'resolved',
}
const SPEC_LABEL: Record<Status, string> = {
  open: 'Open',
  under_review: 'In Review',
  actioned: 'Resolved',
  dismissed: 'Resolved',
}

type Props = {
  row: {
    id: string
    reporter_name: string
    reported_name: string
    category: string
    description: string | null
    status: Status
    created_at: string
  }
}

export function ReportRow({ row }: Props) {
  return (
    <article className="rounded-2xl border border-white/5 bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-cream">
            {row.reporter_name} →{' '}
            <span className="text-mist">reported</span> {row.reported_name}
          </p>
          <p className="mt-0.5 text-[11px] text-mist uppercase tracking-wider">
            Category · {row.category}
          </p>
          {row.description && (
            <p className="mt-1 text-xs text-cream/85 leading-relaxed line-clamp-3">
              {row.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill label={SPEC_LABEL[row.status]} tone={PILL_TONE[row.status]} />
          <StatusSelect<Status>
            value={row.status}
            options={STATUSES}
            onChange={(next) => updateReportStatusAction(row.id, next)}
            labels={SPEC_LABEL}
          />
        </div>
      </div>
      <p className="text-[10px] text-mist/70">
        {new Date(row.created_at).toLocaleString()}
      </p>
    </article>
  )
}

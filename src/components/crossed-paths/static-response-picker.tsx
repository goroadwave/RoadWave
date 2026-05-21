'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendCrossedPathMessageAction } from '@/app/(app)/crossed-paths/actions'

// Quick-tap "Say Hi" templates for the matched-camper dialogue.
// The original RoadWave product framing positions camper-to-camper
// communication as low-pressure introductions, not open-ended chat,
// so the primary affordance is a row of pre-written, friendly
// templates a camper can fire in one tap. The free-form textarea
// below this component is still available for follow-ups.
//
// The templates ride the existing sendCrossedPathMessageAction +
// crossed_paths_messages RLS so no new schema is needed -- each tap
// inserts a regular message with the static body. The receiving
// camper sees them as normal messages on their side.
//
// Templates are deliberately short (under 50 chars), friendly,
// outdoorsy, and bounded -- "Maybe another time" / "Safe travels"
// give a camper a graceful exit if the connection isn't a fit.

const TEMPLATES: { label: string; body: string }[] = [
  { label: 'Nice to meet you 👋', body: 'Hey! Nice to meet you 👋' },
  {
    label: 'Say hi around the campground?',
    body: 'Want to say hi around the campground?',
  },
  {
    label: 'Meet by the office?',
    body: 'Want to meet by the office or the store?',
  },
  { label: 'Walk the dogs?', body: 'Want to walk the dogs?' },
  { label: 'Coffee later?', body: 'Coffee later?' },
  { label: 'Campfire later?', body: 'Campfire later?' },
  { label: 'Maybe another time', body: 'Maybe another time — appreciate the wave!' },
  { label: 'Safe travels!', body: 'Safe travels! 👋' },
]

type Props = {
  crossedPathId: string
}

export function StaticResponsePicker({ crossedPathId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [lastSent, setLastSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function send(template: { label: string; body: string }) {
    if (pending) return
    setError(null)
    const formData = new FormData()
    formData.append('crossed_path_id', crossedPathId)
    formData.append('body', template.body)
    startTransition(async () => {
      const result = await sendCrossedPathMessageAction(
        { ok: false, error: null },
        formData,
      )
      if (!result.ok) {
        setError(result.error ?? 'Could not send.')
        return
      }
      setLastSent(template.label)
      router.refresh()
    })
  }

  return (
    <div
      className="border-t border-white/5 bg-card/40 px-3 py-3 space-y-2"
      data-testid="static-response-picker"
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-flame font-semibold">
        Say hi with a quick tap
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => {
          const justSent = lastSent === t.label
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => send(t)}
              disabled={pending}
              data-testid={`static-response-${slugify(t.label)}`}
              className={
                justSent
                  ? 'inline-flex items-center gap-1 rounded-full border border-flame/40 bg-flame/15 px-3 py-1.5 text-[11px] font-semibold text-flame'
                  : 'inline-flex items-center gap-1 rounded-full border border-flame/30 bg-flame/[0.05] text-cream px-3 py-1.5 text-[11px] font-medium hover:bg-flame/15 hover:border-flame/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <p className="text-[10px] text-mist/70 leading-snug">
        Templates send instantly. Use the text box below for anything
        custom.
      </p>
    </div>
  )
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

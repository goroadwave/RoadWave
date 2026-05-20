'use client'

import { useState, useTransition } from 'react'
import {
  markMessageReadAction,
  markMessageResolvedAction,
  markMessageUnreadAction,
} from '@/app/owner/(authed)/messages/actions'

// Mark Read / Mark Resolved / Mark Unread button row on each message
// card. Optimistic UI: the new status is shown immediately, with a
// rollback if the server action returns ok=false. Uses useTransition
// so the page can keep responding while revalidation runs server-side.

type Status = 'new' | 'read' | 'resolved'

const ACTION: Record<Status, (id: string) => Promise<{ ok: boolean; error: string | null }>> = {
  new: markMessageUnreadAction,
  read: markMessageReadAction,
  resolved: markMessageResolvedAction,
}

const BUTTON_LABEL: Record<Status, string> = {
  new: 'Mark Unread',
  read: 'Mark Read',
  resolved: 'Mark Resolved',
}

const BUTTON_EMOJI: Record<Status, string> = {
  new: '⏪',
  read: '✓',
  resolved: '✅',
}

export function OwnerMessageStatusButtons({
  messageId,
  status,
}: {
  messageId: string
  status: Status
}) {
  // Optimistic mirror of the row's status. revalidatePath inside the
  // server action re-renders the page with the authoritative value;
  // until then we render the optimistic state.
  const [current, setCurrent] = useState<Status>(status)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function changeStatus(next: Status) {
    if (next === current) return
    const previous = current
    setError(null)
    setCurrent(next)
    startTransition(async () => {
      const result = await ACTION[next](messageId)
      if (!result.ok) {
        setCurrent(previous)
        setError(result.error ?? 'Status update failed.')
      }
    })
  }

  // The button shown for a given status depends on the current state:
  //   * "new" -> show Mark Read + Mark Resolved (no point in marking
  //     it unread, it already is).
  //   * "read" -> show Mark Resolved + Mark Unread.
  //   * "resolved" -> show Mark Unread (re-opening should be rare;
  //     marking read is implied by reopening).
  const buttonsToShow: Status[] =
    current === 'new'
      ? ['read', 'resolved']
      : current === 'read'
        ? ['resolved', 'new']
        : ['new']

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {buttonsToShow.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => changeStatus(s)}
          disabled={pending}
          className={
            s === 'resolved'
              ? 'inline-flex items-center gap-1.5 rounded-lg border border-leaf/40 bg-leaf/[0.08] text-leaf px-3 py-1.5 text-xs font-semibold hover:bg-leaf/15 disabled:opacity-50 transition-colors'
              : s === 'new'
                ? 'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-mist px-3 py-1.5 text-xs font-semibold hover:bg-white/10 hover:text-cream disabled:opacity-50 transition-colors'
                : 'inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-cream px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50 transition-colors'
          }
        >
          <span aria-hidden>{BUTTON_EMOJI[s]}</span>
          {BUTTON_LABEL[s]}
        </button>
      ))}
      {error && (
        <span className="text-[11px] text-red-300">{error}</span>
      )}
    </div>
  )
}

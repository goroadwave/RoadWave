'use client'

import { useState, useTransition } from 'react'
import {
  deleteArchivedMessageAction,
  markMessageArchivedAction,
  markMessageReadAction,
  markMessageResolvedAction,
  markMessageUnreadAction,
} from '@/app/owner/(authed)/messages/actions'

// Note: Unarchive (archived -> resolved) reuses markMessageResolvedAction
// rather than the dedicated unarchiveMessageAction export -- both
// resolve to the same RPC call. Keeping the import surface small.

// Status-mutation buttons on each message card. Optimistic UI with
// rollback on server-action error; uses useTransition so the page
// stays interactive while revalidation runs server-side.
//
// Button set depends on the row's current status:
//   * 'new'      -> Mark Read · Mark Resolved · Archive
//   * 'read'     -> Mark Resolved · Mark Unread · Archive
//   * 'resolved' -> Mark Unread · Archive
//   * 'archived' -> Unarchive · Delete Permanently (with hard confirm)

type Status = 'new' | 'read' | 'resolved' | 'archived'

type SimpleAction = (id: string) => Promise<{ ok: boolean; error: string | null }>

const SET_STATUS_ACTION: Record<Exclude<Status, 'archived'>, SimpleAction> & {
  archived: SimpleAction
} = {
  new: markMessageUnreadAction,
  read: markMessageReadAction,
  resolved: markMessageResolvedAction,
  archived: markMessageArchivedAction,
}

const LABEL: Record<Status, string> = {
  new: 'Mark Unread',
  read: 'Mark Read',
  resolved: 'Mark Resolved',
  archived: 'Archive',
}

const EMOJI: Record<Status, string> = {
  new: '⏪',
  read: '✓',
  resolved: '✅',
  archived: '📦',
}

export function OwnerMessageStatusButtons({
  messageId,
  status,
}: {
  messageId: string
  status: Status
}) {
  const [current, setCurrent] = useState<Status>(status)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleted, setDeleted] = useState(false)

  function changeStatus(next: Status) {
    if (next === current) return
    const previous = current
    setError(null)
    setCurrent(next)
    startTransition(async () => {
      const result = await SET_STATUS_ACTION[next](messageId)
      if (!result.ok) {
        setCurrent(previous)
        setError(result.error ?? 'Status update failed.')
      }
    })
  }

  function confirmDelete() {
    setError(null)
    setConfirmingDelete(false)
    startTransition(async () => {
      const result = await deleteArchivedMessageAction(messageId)
      if (!result.ok) {
        setError(result.error ?? 'Delete failed.')
        return
      }
      // The card stays in the DOM until revalidatePath fires; show a
      // "Deleted." note in place of the buttons so the owner sees the
      // confirmation. Next render drops the row entirely.
      setDeleted(true)
    })
  }

  if (deleted) {
    return (
      <p className="pt-1 text-[11px] text-mist italic">
        Deleted. This row will disappear on the next refresh.
      </p>
    )
  }

  // Pick which buttons render for the current status. Archive only
  // appears on active states; archived rows show Unarchive + Delete.
  let buttonsToShow: Status[] = []
  if (current === 'new') buttonsToShow = ['read', 'resolved', 'archived']
  else if (current === 'read') buttonsToShow = ['resolved', 'new', 'archived']
  else if (current === 'resolved') buttonsToShow = ['new', 'archived']
  else if (current === 'archived') buttonsToShow = ['resolved']

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {buttonsToShow.map((s) => {
        // Unarchive button on archived rows shows "Unarchive" text;
        // otherwise normal label.
        const isUnarchive = current === 'archived' && s === 'resolved'
        const label = isUnarchive ? 'Unarchive' : LABEL[s]
        const emoji = isUnarchive ? '↩️' : EMOJI[s]
        const styleClass =
          s === 'resolved'
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-leaf/40 bg-leaf/[0.08] text-leaf px-3 py-1.5 text-xs font-semibold hover:bg-leaf/15 disabled:opacity-50 transition-colors'
            : s === 'new'
              ? 'inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 text-mist px-3 py-1.5 text-xs font-semibold hover:bg-white/10 hover:text-cream disabled:opacity-50 transition-colors'
              : s === 'archived'
                ? 'inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-mist px-3 py-1.5 text-xs font-semibold hover:bg-white/[0.08] hover:text-cream disabled:opacity-50 transition-colors'
                : 'inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-cream px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50 transition-colors'
        return (
          <button
            key={s}
            type="button"
            onClick={() => changeStatus(s)}
            disabled={pending}
            className={styleClass}
          >
            <span aria-hidden>{emoji}</span>
            {label}
          </button>
        )
      })}
      {current === 'archived' && (
        <>
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/[0.05] text-red-300 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/15 hover:border-red-500/50 disabled:opacity-50 transition-colors"
            >
              <span aria-hidden>🗑️</span>
              Delete Permanently
            </button>
          ) : (
            // Inline confirmation row -- avoids a modal for one
            // button. The cancel option is just as visible as the
            // confirm option so an accidental click is easy to back
            // out of.
            <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/[0.08] px-3 py-1.5">
              <span className="text-[11px] text-red-200">
                Permanently delete? Cannot be undone.
              </span>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="rounded bg-red-500/80 text-white px-2 py-0.5 text-[11px] font-semibold hover:bg-red-500 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={pending}
                className="rounded bg-white/10 text-cream px-2 py-0.5 text-[11px] font-semibold hover:bg-white/15 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <span className="text-[11px] text-red-300">{error}</span>
      )}
    </div>
  )
}

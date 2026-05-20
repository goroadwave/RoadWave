'use client'

import { useState, useTransition } from 'react'
import { archiveAllResolvedAction } from '@/app/owner/(authed)/messages/actions'

// Top-level "Archive Resolved" button rendered above the inbox.
// One click pops an inline confirmation; the second click fires the
// bulk RPC and shows how many rows were archived. revalidatePath on
// the server side re-renders the page with the resolved rows gone
// from the active view.

export function OwnerMessageBulkArchive({
  resolvedCount,
}: {
  /** Count of currently-visible resolved rows. Drives the button
   *  label and the "no resolved to archive" empty state. */
  resolvedCount: number
}) {
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (resolvedCount === 0) return null

  function fire() {
    setError(null)
    setResult(null)
    setConfirming(false)
    startTransition(async () => {
      const r = await archiveAllResolvedAction()
      if (!r.ok) {
        setError(r.error ?? 'Archive failed.')
        return
      }
      setResult(
        r.archivedCount === 1
          ? 'Archived 1 resolved message.'
          : `Archived ${r.archivedCount} resolved messages.`,
      )
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-flame/40 bg-flame/[0.08] text-flame px-3 py-1.5 text-xs font-semibold hover:bg-flame/15 hover:border-flame/60 disabled:opacity-50 transition-colors"
        >
          <span aria-hidden>📦</span>
          Archive Resolved ({resolvedCount})
        </button>
      ) : (
        <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-flame/40 bg-flame/[0.08] px-3 py-2">
          <span className="text-[11px] text-cream leading-snug">
            Archive all {resolvedCount} resolved messages? They&apos;ll be
            removed from the active inbox but can still be viewed under
            Archived.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fire}
              disabled={pending}
              className="rounded bg-flame text-night px-3 py-0.5 text-[11px] font-semibold hover:bg-amber-400 disabled:opacity-50"
            >
              Archive
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded bg-white/10 text-cream px-3 py-0.5 text-[11px] font-semibold hover:bg-white/15 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {result && (
        <span className="text-[11px] text-leaf">{result}</span>
      )}
      {error && (
        <span className="text-[11px] text-red-300">{error}</span>
      )}
    </div>
  )
}

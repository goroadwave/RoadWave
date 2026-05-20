'use client'

import { useState, useTransition } from 'react'
import { postOwnerReplyAction } from '@/app/owner/(authed)/messages/actions'

// Inline reply form mounted under each Contact the Office message card.
// Collapsed by default; opens to a textarea + Send Reply button when
// the owner clicks "Reply to guest." Wraps postOwnerReplyAction, which
// calls owner_post_message_reply (mig 0055) -- the RPC enforces the
// campground_admins ownership check server-side.
//
// On send success: clears the textarea, closes the panel, and shows a
// brief "Reply sent" line. The page revalidates via the server action
// so the new bubble appears in the thread on the next render.

export function OwnerMessageReplyForm({
  messageId,
  canEmailGuest,
}: {
  messageId: string
  /** When true, the form shows a small note that the guest will get an
   *  email when this reply is sent (because they provided an email).
   *  Purely informational -- the email send happens server-side
   *  regardless of this flag, which is just for the UI label. */
  canEmailGuest: boolean
}) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sentNote, setSentNote] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit() {
    const trimmed = body.trim()
    if (trimmed.length === 0) {
      setError('Type a reply first.')
      return
    }
    if (trimmed.length > 4000) {
      setError('Reply is too long (max 4000 chars).')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await postOwnerReplyAction(messageId, trimmed)
      if (!result.ok) {
        setError(result.error ?? 'Send failed.')
        return
      }
      setBody('')
      setOpen(false)
      setSentNote(true)
      window.setTimeout(() => setSentNote(false), 4000)
    })
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setSentNote(false)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-flame/40 bg-flame/[0.08] text-flame px-3 py-1.5 text-xs font-semibold hover:bg-flame/15 transition-colors"
        >
          <span aria-hidden>💬</span>
          Reply to guest
        </button>
        {sentNote && (
          <span className="text-[11px] text-leaf">Reply sent.</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-flame/30 bg-flame/[0.04] p-3">
      <p className="text-[11px] text-mist leading-snug">
        Private reply to this guest only. They&apos;ll see it on a
        token-gated page; nobody else has access.
        {canEmailGuest && (
          <>
            {' '}
            We&apos;ll also email them a link since they provided an
            email address.
          </>
        )}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="Write your reply..."
        className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50 resize-none"
        disabled={pending}
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Sending...' : 'Send reply'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
            setBody('')
          }}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-cream px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

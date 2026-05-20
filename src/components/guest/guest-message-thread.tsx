'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Guest-side thread view + reply form. Loads /m/<id>?t=<token>.
//
// Access gate: the guest types their site number + last name. We pass
// them along with the token to guest_message_thread RPC (mig 0055),
// which only returns data if all three match (case-insensitive trimmed
// comparison done server-side). The same gate applies to the reply
// post via guest_post_message_reply.
//
// We deliberately do NOT pre-fill site / last name from the URL so an
// accidentally-forwarded link can't bypass the second factor.

type ThreadRow = {
  message_body: string | null
  message_submitted_at: string | null
  campground_name: string | null
  reply_id: string | null
  reply_sender: 'owner' | 'guest' | null
  reply_body: string | null
  reply_created_at: string | null
}

type LoadedThread = {
  messageBody: string
  messageSubmittedAt: string
  campgroundName: string
  replies: {
    id: string
    sender: 'owner' | 'guest'
    body: string
    createdAt: string
  }[]
}

export function GuestMessageThread({
  messageId,
  token,
  campgroundBackHref,
}: {
  messageId: string
  token: string
  /** Resolved "/campground/<slug>" target when the page knew which
   *  campground the camper came from. NULL when no safe slug was
   *  available (legacy entries / tampered query string) -- in that
   *  case we render NO prominent "back to campground" button, only a
   *  small "RoadWave home" footer link so the camper isn't stranded. */
  campgroundBackHref: string | null
}) {
  const [siteNumber, setSiteNumber] = useState('')
  const [lastName, setLastName] = useState('')
  const [thread, setThread] = useState<LoadedThread | null>(null)
  const [unlocking, startUnlocking] = useTransition()
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replying, startReplying] = useTransition()
  const [replyError, setReplyError] = useState<string | null>(null)
  const [sentNote, setSentNote] = useState(false)

  // Bail early if either piece is missing -- no point letting the
  // user type anything if the token isn't even in the URL.
  if (!messageId || !token) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.05] p-5 space-y-2">
        <p className="text-sm font-semibold text-cream">Link incomplete.</p>
        <p className="text-xs text-mist leading-snug">
          This page needs both a message id and a reply token in the URL.
          Use the link the office (or your post-submit confirmation) gave
          you -- a fresh copy from the email should always work.
        </p>
      </div>
    )
  }

  async function loadThread(site: string, last: string): Promise<void> {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .rpc('guest_message_thread', {
        _message_id: messageId,
        _token: token,
        _site_number: site,
        _last_name: last,
      })
      .returns<ThreadRow[]>()
    if (error) {
      throw new Error(error.message)
    }
    const rows = (data ?? []) as ThreadRow[]
    if (rows.length === 0) {
      throw new Error(
        "Couldn't find a thread for that combination. Double-check your site number + last name (case doesn't matter).",
      )
    }
    const first = rows[0]
    const replies = rows
      .filter((r) => r.reply_id !== null)
      .map((r) => ({
        id: r.reply_id as string,
        sender: r.reply_sender as 'owner' | 'guest',
        body: r.reply_body as string,
        createdAt: r.reply_created_at as string,
      }))
    setThread({
      messageBody: first.message_body ?? '',
      messageSubmittedAt: first.message_submitted_at ?? '',
      campgroundName: first.campground_name ?? 'Campground office',
      replies,
    })
  }

  function unlock(e: React.FormEvent) {
    e.preventDefault()
    if (unlocking) return
    const site = siteNumber.trim()
    const last = lastName.trim()
    if (!site) {
      setUnlockError('Site number required.')
      return
    }
    if (!last) {
      setUnlockError('Last name required.')
      return
    }
    setUnlockError(null)
    startUnlocking(async () => {
      try {
        await loadThread(site, last)
      } catch (err) {
        setUnlockError(err instanceof Error ? err.message : 'Lookup failed.')
      }
    })
  }

  function submitReply() {
    if (!thread) return
    const trimmed = replyBody.trim()
    if (trimmed.length === 0) {
      setReplyError('Type a reply first.')
      return
    }
    if (trimmed.length > 4000) {
      setReplyError('Reply is too long (max 4000 chars).')
      return
    }
    setReplyError(null)
    startReplying(async () => {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.rpc('guest_post_message_reply', {
        _message_id: messageId,
        _token: token,
        _site_number: siteNumber.trim(),
        _last_name: lastName.trim(),
        _body: trimmed,
      })
      if (error) {
        setReplyError(error.message)
        return
      }
      setReplyBody('')
      setSentNote(true)
      window.setTimeout(() => setSentNote(false), 4000)
      // Re-fetch the thread so the new reply shows up immediately.
      try {
        await loadThread(siteNumber.trim(), lastName.trim())
      } catch {
        // The reply already saved server-side; a re-fetch failure
        // shouldn't block the UX -- just leave the existing thread.
      }
    })
  }

  if (!thread) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame">
            Private reply thread
          </p>
          <h1 className="font-display text-2xl font-extrabold text-cream leading-[1.1]">
            Confirm it&apos;s you
          </h1>
          <p className="text-xs text-mist leading-snug">
            Enter the site number + last name you used when you sent the
            message to the office. Both have to match before the thread
            loads -- this keeps the reply private to you.
          </p>
          {campgroundBackHref && (
            <p className="text-xs text-mist leading-snug">
              You can return to the campground page anytime.
            </p>
          )}
        </div>
        <form
          onSubmit={unlock}
          className="space-y-3 rounded-2xl border border-white/10 bg-card p-4"
        >
          <Field label="Site number" required>
            <input
              type="text"
              value={siteNumber}
              onChange={(e) => setSiteNumber(e.target.value)}
              maxLength={60}
              placeholder="e.g. 12, A-7, Birch 14"
              className={inputCls}
              required
              autoComplete="off"
            />
          </Field>
          <Field label="Last name" required>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={80}
              placeholder="Smith"
              className={inputCls}
              required
              autoComplete="family-name"
            />
          </Field>
          {unlockError && <p className="text-xs text-red-300">{unlockError}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={unlocking}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {unlocking ? 'Checking...' : 'View thread'}
            </button>
            {campgroundBackHref && (
              <Link
                href={campgroundBackHref}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-cream px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                ← Back to campground page
              </Link>
            )}
          </div>
        </form>
        {!campgroundBackHref && (
          <div className="pt-2">
            <Link
              href="/"
              className="text-xs text-mist/80 underline-offset-2 hover:text-cream hover:underline"
            >
              RoadWave home
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame">
          Private thread with {thread.campgroundName}
        </p>
        <h1 className="font-display text-2xl font-extrabold text-cream leading-[1.1]">
          Reply thread
        </h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">
            Your original message
          </span>
          <span className="text-[10px] text-mist tabular-nums">
            {formatRelative(thread.messageSubmittedAt)}
          </span>
        </div>
        <p className="text-sm text-cream leading-relaxed whitespace-pre-wrap">
          {thread.messageBody}
        </p>
      </section>

      {thread.replies.length === 0 ? (
        <p className="text-xs text-mist italic">
          No reply from the office yet. We&apos;ll email you a notification
          here when there is one (if you gave them an email). You can
          also bookmark this page and come back.
        </p>
      ) : (
        <ul className="space-y-2">
          {thread.replies.map((r) => (
            <li
              key={r.id}
              className={
                r.sender === 'owner'
                  ? 'rounded-xl border border-flame/30 bg-flame/[0.06] p-3'
                  : 'rounded-xl border border-leaf/30 bg-leaf/[0.05] p-3'
              }
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={
                    r.sender === 'owner'
                      ? 'text-[10px] font-semibold uppercase tracking-[0.18em] text-flame'
                      : 'text-[10px] font-semibold uppercase tracking-[0.18em] text-leaf'
                  }
                >
                  {r.sender === 'owner' ? 'Office' : 'You'}
                </span>
                <span className="text-[10px] text-mist tabular-nums">
                  {formatRelative(r.createdAt)}
                </span>
              </div>
              <p className="text-sm text-cream leading-relaxed whitespace-pre-wrap">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-2xl border border-flame/30 bg-flame/[0.04] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame">
          Reply to the office
        </p>
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Write your reply..."
          className={textareaCls}
          disabled={replying}
        />
        {replyError && <p className="text-xs text-red-300">{replyError}</p>}
        {sentNote && <p className="text-xs text-leaf">Reply sent.</p>}
        <button
          type="button"
          onClick={submitReply}
          disabled={replying}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {replying ? 'Sending...' : 'Send reply'}
        </button>
      </div>

      {/* Bottom return link so the camper never feels stuck on this
          page after reading / replying. When we know the campground,
          we render the prominent back link. When we don't, we degrade
          to a small "RoadWave home" link so they at least have a way
          out without us claiming a return-to-campground we can't
          actually fulfil. */}
      <div className="pt-2">
        {campgroundBackHref ? (
          <Link
            href={campgroundBackHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            ← Back to campground page
          </Link>
        ) : (
          <Link
            href="/"
            className="text-xs text-mist/80 underline-offset-2 hover:text-cream hover:underline"
          >
            RoadWave home
          </Link>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-cream">
        {label}
        {required && (
          <span aria-hidden className="text-red-300 ml-0.5">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function formatRelative(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffMs = Date.now() - t
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50'

const textareaCls = inputCls + ' resize-none'

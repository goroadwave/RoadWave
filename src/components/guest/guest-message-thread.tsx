'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
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
//
// Same-device skip
// ----------------
// When the camper opens /m/<id> from a device that already has the
// thread persisted in localStorage (because that device is where the
// camper submitted the original Contact Office message), we
// auto-unlock with the stored site number + last name and skip the
// verification form entirely. The token in the URL still has to
// match the stored token -- this is just a UX shortcut so the camper
// doesn't re-type credentials they already proved on this device.
//
// Email reply links from a different device / browser, or after the
// camper tapped "Clear from this device" on the QR-page tracker, fall
// through to the normal site+last-name gate.

// localStorage key prefix shared with camper-message-storage.ts. We
// keep a copy here instead of importing the helper so the bundled
// page doesn't drag the whole tracker module + its React hooks into
// the /m/<id> route.
const STORED_PREFIX = 'roadwave:office-msgs:'

type StoredHint = {
  siteNumber: string
  lastName: string
}

function readStoredCredsForMessage(
  messageId: string,
  token: string,
): StoredHint | null {
  if (typeof window === 'undefined') return null
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(STORED_PREFIX)) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        continue
      }
      if (!Array.isArray(parsed)) continue
      for (const entry of parsed) {
        if (!entry || typeof entry !== 'object') continue
        const r = entry as Record<string, unknown>
        if (typeof r.id !== 'string' || r.id !== messageId) continue
        // Token in localStorage MUST match the token in the URL.
        // A token mismatch means the stored entry isn't this thread
        // (e.g. ids collided across campgrounds, or someone is
        // poking at the URL) -- fall through to the verification
        // gate rather than auto-unlocking with the wrong creds.
        if (typeof r.token !== 'string' || r.token !== token) continue
        if (typeof r.siteNumber !== 'string' || r.siteNumber.length === 0) {
          continue
        }
        if (typeof r.lastName !== 'string' || r.lastName.length === 0) continue
        return { siteNumber: r.siteNumber, lastName: r.lastName }
      }
    }
  } catch {
    // Storage disabled / quota issues -- silently fall through to
    // the manual verification gate.
  }
  return null
}

type ThreadRow = {
  message_body: string | null
  message_submitted_at: string | null
  campground_name: string | null
  /** Added by mig 0056. The RPC now joins campgrounds and surfaces
   *  the slug so legacy /m/[id] links (no ?from= in the URL,
   *  pre-afbda07 localStorage entries) can still build an accurate
   *  "Back to campground page" target after the camper unlocks. */
  campground_slug: string | null
  reply_id: string | null
  reply_sender: 'owner' | 'guest' | null
  reply_body: string | null
  reply_created_at: string | null
}

type LoadedThread = {
  messageBody: string
  messageSubmittedAt: string
  campgroundName: string
  campgroundSlug: string | null
  replies: {
    id: string
    sender: 'owner' | 'guest'
    body: string
    createdAt: string
  }[]
}

// Defense-in-depth slug validator (mirrors normalizeFromSlug on the
// /m/[id] server component). The slug from the RPC comes from the
// trusted campgrounds table, but we still constrain it to a safe
// shape before building a navigation target.
const SLUG_RE = /^[a-z0-9-]{1,80}$/

function safeBackHrefFromSlug(slug: string | null | undefined): string | null {
  if (typeof slug !== 'string') return null
  const trimmed = slug.trim().toLowerCase()
  if (!SLUG_RE.test(trimmed)) return null
  return `/campground/${trimmed}`
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
  // Track whether the page is auto-unlocking from same-device
  // localStorage credentials. While true the form is suppressed and
  // a small "Unlocking…" message renders instead. If the auto-unlock
  // fails (network error, expired token, stored creds mismatch
  // server-side) we fall back to the manual verification gate with
  // the stored creds NOT pre-filled (so the camper sees a clean
  // form, not a confused state).
  const [autoAttempted, setAutoAttempted] = useState(false)
  const autoAttemptRef = useRef(false)

  // Same-device skip: scan localStorage for a stored entry that
  // matches messageId + token, and if found auto-unlock with the
  // stored site + last name. Runs once per mount; falls back to the
  // manual gate when nothing matches or the auto-unlock fails.
  useEffect(() => {
    if (autoAttemptRef.current) return
    autoAttemptRef.current = true
    if (!messageId || !token) return
    const hint = readStoredCredsForMessage(messageId, token)
    if (!hint) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoAttempted(true)
    setSiteNumber(hint.siteNumber)
    setLastName(hint.lastName)
    startUnlocking(async () => {
      try {
        await loadThread(hint.siteNumber, hint.lastName)
      } catch {
        // Same-device unlock failed (token expired, RPC error, etc).
        // Drop the auto-attempt flag so the manual verification form
        // renders -- the camper can re-type and try again.
        setAutoAttempted(false)
        setSiteNumber('')
        setLastName('')
      }
    })
    // loadThread is declared below the effect but its identity is
    // stable across renders -- it closes over messageId + token,
    // which are component props. ESLint can't prove that, so we
    // explicitly list only the dependencies we care about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, token])

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
      campgroundSlug: first.campground_slug ?? null,
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
    // Auto-unlock is in flight from the same-device localStorage
    // path. Suppress the verification form so the camper doesn't
    // see a flash of "Confirm it's you" before the thread loads.
    if (autoAttempted && unlocking) {
      return (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flame">
            Private reply thread
          </p>
          <p className="text-sm text-mist leading-snug">Unlocking…</p>
        </div>
      )
    }
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
            To protect your private message, please confirm your site
            number and last name. Both have to match what you used when
            you first sent the message.
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

  // Pick the best available back-to-campground target:
  //   1. URL ?from=<slug> (already validated by the /m/[id] server
  //      component and passed in as campgroundBackHref).
  //   2. The slug returned by the RPC (mig 0056), validated again
  //      here as defense in depth. This rescues legacy /m/[id] links
  //      where the URL lacked &from= -- pre-afbda07 localStorage
  //      entries and any owner-reply email links issued before the
  //      slug field landed.
  //   3. Null (camper sees a small "RoadWave home" footer link only).
  const effectiveBackHref =
    campgroundBackHref ?? safeBackHrefFromSlug(thread.campgroundSlug)

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
          page after reading / replying. Uses the effective back href
          -- URL slug first, RPC slug second, "RoadWave home" only as
          a last resort (e.g. token expired and the RPC returned no
          rows). */}
      <div className="pt-2">
        {effectiveBackHref ? (
          <Link
            href={effectiveBackHref}
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

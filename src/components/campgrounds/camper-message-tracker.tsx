'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  dismissCamperMessage,
  markCamperMessageSeen,
  undismissCamperMessage,
  useCamperMessages,
  type StoredCamperMessage,
} from '@/components/campgrounds/camper-message-storage'
import {
  LANTERN_OFFICE_REPLY_EVENT,
  LANTERN_OPEN_THREAD_EVENT,
} from '@/components/campgrounds/lantern-storage'

// Persistent "Your messages with the office" card list rendered inside
// the unified Office Help & Messages section (welcome-engagement.tsx
// owns the surrounding <section> + heading + id="office-help" anchor;
// this component renders nothing but the cards + the in-page "Office
// replied" banner). Drives:
//
//   * Reload-safe restoration of the camper's threads (mounted from
//     the localStorage entries written by ContactOffice on submit).
//   * Lightweight polling of guest_message_thread (mig 0055) for each
//     entry while the tab is visible -- gives an "Office replied"
//     in-page banner + a "new reply" indicator on the card.
//   * Inline thread expansion -- tapping "View office reply" or
//     "Check replies" loads the full thread + reply textarea inline
//     inside the card. NO new tab, NO modal, NO navigation away from
//     the QR page. (External /m/<id> email links remain functional
//     and still gate on site+last name for non-original devices.)
//   * Cross-surface "open thread" event -- the bottom-of-screen toast
//     and the Lantern dispatch LANTERN_OPEN_THREAD_EVENT; the tracker
//     listens, scrolls #office-help into view, and auto-expands the
//     matching card.
//   * Hide from this page action -- soft-hides the card via a
//     dismissedAt timestamp on the localStorage entry. The poll loop
//     keeps watching the thread, so if the office replies after the
//     camper hid the card the dismiss is auto-cleared and the card
//     resurfaces with the New Reply chip + toast. Replaces the older
//     hard-delete behavior, which silently broke the reply chain on
//     the camper side. (Server-side message + token are never
//     touched by either path.)
//
// Privacy guardrails:
//   * Scoped per campgroundId; entries for other campgrounds are never
//     read or rendered here.
//   * Polling + inline-expand fetches use the exact same gate the
//     camper used to submit (token + site + last). A wrong stored
//     value just gets an empty result -- the polling layer never sees
//     data it isn't authorized to see.
//   * Owner inbox is never queried; only the camper's own threads.
//   * Site number + last name are typed by the camper into a form on
//     this device and never echoed back to other surfaces.

type LiveStatus = 'loading' | 'ok' | 'missing'

type LiveSummary = {
  status: LiveStatus
  ownerReplyCount: number
  latestReplyAt: string | null
  latestOwnerReplyAt: string | null
}

type LiveEntry = StoredCamperMessage & LiveSummary

type ThreadRow = {
  message_body: string | null
  message_submitted_at: string | null
  campground_name: string | null
  reply_id: string | null
  reply_sender: 'owner' | 'guest' | null
  reply_body: string | null
  reply_created_at: string | null
}

type ThreadReply = {
  id: string
  sender: 'owner' | 'guest'
  body: string
  createdAt: string
}

type FullThread = {
  messageBody: string
  messageSubmittedAt: string
  campgroundName: string
  replies: ThreadReply[]
}

type ExpandedState = {
  loading: boolean
  error: string | null
  thread: FullThread | null
}

// Friendly category labels -- mirrors the owner inbox + email helper.
// Pulled inline (not imported) so this client component stays small.
const CATEGORY_LABEL: Record<string, string> = {
  wifi: 'Wi-Fi issue',
  maintenance: 'Maintenance issue',
  noise: 'Noise concern',
  bathroom_laundry: 'Bathroom / laundry issue',
  late_checkout: 'Late checkout question',
  general_question: 'General question',
  compliment: 'Compliment',
  suggestion: 'Suggestion',
  safety_concern: 'Safety concern',
  laundry: 'Laundry',
  propane: 'Propane',
  quiet_hours: 'Quiet hours / noise concern',
  local_recommendations: 'Local recommendations',
  activities: 'Activities',
}

const POLL_INTERVAL_MS = 30_000

async function fetchThreadRows(
  entry: Pick<StoredCamperMessage, 'id' | 'token' | 'siteNumber' | 'lastName'>,
): Promise<ThreadRow[] | { missing: true }> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .rpc('guest_message_thread', {
      _message_id: entry.id,
      _token: entry.token,
      _site_number: entry.siteNumber,
      _last_name: entry.lastName,
    })
    .returns<ThreadRow[]>()
  if (error) return { missing: true }
  const rows = (data ?? []) as ThreadRow[]
  if (rows.length === 0) return { missing: true }
  return rows
}

function summarizeRows(rows: ThreadRow[]): {
  ownerReplyCount: number
  latestReplyAt: string | null
  latestOwnerReplyAt: string | null
} {
  let ownerReplyCount = 0
  let latestReplyAt: string | null = null
  let latestOwnerReplyAt: string | null = null
  for (const r of rows) {
    if (!r.reply_id || !r.reply_created_at) continue
    if (!latestReplyAt || r.reply_created_at > latestReplyAt) {
      latestReplyAt = r.reply_created_at
    }
    if (r.reply_sender === 'owner') {
      ownerReplyCount += 1
      if (!latestOwnerReplyAt || r.reply_created_at > latestOwnerReplyAt) {
        latestOwnerReplyAt = r.reply_created_at
      }
    }
  }
  return { ownerReplyCount, latestReplyAt, latestOwnerReplyAt }
}

function rowsToFullThread(rows: ThreadRow[]): FullThread {
  const first = rows[0]
  const replies: ThreadReply[] = rows
    .filter((r) => r.reply_id !== null && r.reply_created_at !== null)
    .map((r) => ({
      id: r.reply_id as string,
      sender: r.reply_sender as 'owner' | 'guest',
      body: r.reply_body ?? '',
      createdAt: r.reply_created_at as string,
    }))
    // Oldest reply first so the conversation reads top-to-bottom.
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
  return {
    messageBody: first.message_body ?? '',
    messageSubmittedAt: first.message_submitted_at ?? '',
    campgroundName: first.campground_name ?? 'Campground office',
    replies,
  }
}

export function CamperMessageTracker({
  campgroundId,
  previewMode = false,
}: {
  campgroundId: string
  /** Owner preview at /owner/preview mounts this component too. We
   *  skip persistence + polling in preview so the owner doesn't
   *  accidentally write demo entries into their own localStorage. */
  previewMode?: boolean
}) {
  // Shared subscription -- the OfficeHelpSection wrapper reads the
  // same hook to decide between "form expanded" vs "form collapsed
  // behind Send another message" so we never duplicate the
  // subscription logic.
  const stored = useCamperMessages(campgroundId, previewMode)

  // Live polling state, keyed by message id. Separate from the stored
  // entries so refreshing localStorage doesn't blow away ongoing poll
  // results.
  const [liveById, setLiveById] = useState<Record<string, LiveSummary>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [threadById, setThreadById] = useState<Record<string, ExpandedState>>(
    {},
  )

  // We deliberately do NOT render an in-page "office replied" banner
  // anymore: the floating toast (CamperToastHost) is the single
  // temporary surface for new replies, and the persistent card below
  // already shows a "New Reply" chip + the appropriate CTA button
  // when latestOwnerReplyAt > lastSeenReplyAt. Showing both at the
  // same time produced two visually-similar cards in the same
  // section and read as a duplicate to campers.

  // Merge stored + live into the LiveEntry shape. `entries` is the
  // SUPERSET (includes dismissed threads) -- the polling loop reads
  // from this so a soft-hidden thread still gets polled. The visible
  // card list below filters out dismissed entries; the floating toast
  // event + un-dismiss path is how a soft-hidden thread resurfaces
  // when the office replies.
  const entries: LiveEntry[] = stored.map((s) => {
    const live = liveById[s.id]
    return {
      ...s,
      status: live?.status ?? 'loading',
      ownerReplyCount: live?.ownerReplyCount ?? 0,
      latestReplyAt: live?.latestReplyAt ?? null,
      latestOwnerReplyAt: live?.latestOwnerReplyAt ?? null,
    }
  })
  const visibleEntries = entries.filter((e) => e.dismissedAt === null)

  // Tracks the last seen latestOwnerReplyAt for each entry so we can
  // detect a transition (no banner on the *initial* poll -- we don't
  // want to scream "new reply" the moment the page loads if there
  // already was one from a previous session). After the initial
  // baseline, ANY advance triggers a banner -- including the common
  // case where the first poll saw null (no reply yet) and a later
  // poll sees a fresh reply. (Earlier code gated on `wasLatest !==
  // null` which suppressed exactly that transition; the bug meant
  // the QR-page toast never fired for the very first office reply
  // received during a single session.)
  const seenOwnerReplyRef = useRef<Map<string, string | null>>(new Map())

  // Polling loop. Visible-only. Cleared and restarted whenever the
  // entry list changes so the poll always sees the latest entries.
  const entryIdsKey = entries.map((e) => e.id).join('|')
  useEffect(() => {
    if (previewMode) return
    if (entries.length === 0) return

    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      if (cancelled) return
      if (document.visibilityState !== 'visible') {
        timerId = setTimeout(tick, POLL_INTERVAL_MS)
        return
      }
      const toPoll = entries.slice(0, 3)
      const results = await Promise.all(
        toPoll.map(async (e) => {
          const res = await fetchThreadRows(e)
          if ('missing' in res) {
            return {
              id: e.id,
              ownerReplyCount: 0,
              latestReplyAt: null,
              latestOwnerReplyAt: null,
              missing: true,
            }
          }
          const sum = summarizeRows(res)
          return { id: e.id, ...sum, missing: false }
        }),
      )
      if (cancelled) return

      let firedReplyFor: string | null = null
      const updates: Record<string, LiveSummary> = {}
      for (const r of results) {
        const wasLatest = seenOwnerReplyRef.current.get(r.id)
        // First poll for an entry (`undefined`) just captures a
        // baseline -- no notification. Every subsequent poll fires
        // when latestOwnerReplyAt advances, INCLUDING null -> non-null
        // (camper sent a message during this session, office replied
        // while the page was still open).
        if (
          wasLatest !== undefined &&
          r.latestOwnerReplyAt &&
          r.latestOwnerReplyAt !== wasLatest &&
          (wasLatest === null || r.latestOwnerReplyAt > wasLatest)
        ) {
          firedReplyFor = r.id
        }
        // Soft-hide recovery: if this entry was dismissed and the
        // newly-fetched owner reply landed AFTER the dismiss, clear
        // the dismiss so the card resurfaces. Works whether the
        // dismiss happened in this session or a previous one
        // (dismissedAt persists in localStorage). Re-mounting on
        // page load triggers this same code path -- a returning
        // camper with a dismissed thread and a fresh reply will see
        // the card on the first poll.
        const stillStored = entries.find((e) => e.id === r.id)
        if (
          stillStored &&
          stillStored.dismissedAt !== null &&
          r.latestOwnerReplyAt !== null &&
          r.latestOwnerReplyAt > stillStored.dismissedAt
        ) {
          undismissCamperMessage(campgroundId, r.id)
          // Force the toast event too so the camper notices the
          // re-surfaced card without needing to glance at the
          // section. firedReplyFor takes precedence so we don't
          // double-fire if the reply was also a fresh advance.
          if (!firedReplyFor) firedReplyFor = r.id
        }
        seenOwnerReplyRef.current.set(r.id, r.latestOwnerReplyAt)
        updates[r.id] = {
          status: r.missing ? 'missing' : 'ok',
          ownerReplyCount: r.ownerReplyCount,
          latestReplyAt: r.latestReplyAt,
          latestOwnerReplyAt: r.latestOwnerReplyAt,
        }
      }
      setLiveById((prev) => ({ ...prev, ...updates }))
      if (firedReplyFor) {
        // Nudge the Lantern + the floating toast host that a new
        // reply landed. Both subscribe to LANTERN_OFFICE_REPLY_EVENT
        // and re-derive from the (existing) tracker storage. The
        // tracker itself does NOT render an in-page banner here
        // anymore -- the persistent message card's "New Reply" chip
        // is the only inline indicator inside the section.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(LANTERN_OFFICE_REPLY_EVENT, {
              detail: { campgroundId, threadId: firedReplyFor },
            }),
          )
        }
      }

      timerId = setTimeout(tick, POLL_INTERVAL_MS)
    }

    tick()

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        if (timerId) clearTimeout(timerId)
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // entryIdsKey changes when the list of stored entries changes
    // identity (add / remove / clear). The polling code reads the
    // live `entries` array via closure on each tick; ESLint can't
    // tell that `entries` is derived from `stored` (which the hook
    // returns with stable identity), so we silence the dep warning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryIdsKey, previewMode, campgroundId])

  // Load full thread (message body + replies) for inline expansion.
  // Reuses the same RPC the polling loop uses; we just keep the rows
  // around for rendering instead of summarizing them.
  const loadFullThread = useCallback(
    async (entry: LiveEntry): Promise<void> => {
      setThreadById((prev) => ({
        ...prev,
        [entry.id]: {
          loading: true,
          error: null,
          thread: prev[entry.id]?.thread ?? null,
        },
      }))
      const res = await fetchThreadRows(entry)
      if ('missing' in res) {
        setThreadById((prev) => ({
          ...prev,
          [entry.id]: {
            loading: false,
            error:
              'This thread is no longer available. The link may have expired.',
            thread: null,
          },
        }))
        return
      }
      const full = rowsToFullThread(res)
      const sum = summarizeRows(res)
      setLiveById((prev) => ({
        ...prev,
        [entry.id]: { ...sum, status: 'ok' },
      }))
      setThreadById((prev) => ({
        ...prev,
        [entry.id]: { loading: false, error: null, thread: full },
      }))
    },
    [],
  )

  const openInline = useCallback(
    (entry: LiveEntry) => {
      // Mark the latest reply seen so the per-card "New Reply" chip
      // clears the next time we re-derive from storage.
      if (entry.latestReplyAt) {
        markCamperMessageSeen(campgroundId, entry.id, entry.latestReplyAt)
      }
      setLiveById((prev) => {
        const live = prev[entry.id]
        if (!live) return prev
        return { ...prev, [entry.id]: { ...live, latestOwnerReplyAt: null } }
      })
      setExpandedId(entry.id)
      void loadFullThread(entry)
    },
    [campgroundId, loadFullThread],
  )

  // Cross-surface "open thread" event. The toast and the Lantern
  // dispatch this so they can keep the camper inside the unified
  // section instead of opening /m/<id> in a new tab.
  useEffect(() => {
    if (previewMode) return
    function onOpenThread(e: Event) {
      const ce = e as CustomEvent<{
        campgroundId?: string
        threadId?: string
      }>
      if (ce.detail?.campgroundId !== campgroundId) return
      const threadId = ce.detail.threadId
      if (!threadId) return
      const entry = entries.find((x) => x.id === threadId)
      if (!entry) return
      openInline(entry)
      // Scroll the unified section into view AFTER:
      //   1. the OfficeHelpCard disclosure has had time to open in
      //      response to the same event (it also listens for
      //      LANTERN_OPEN_THREAD_EVENT and force-opens the <details>),
      //   2. this tracker has committed the expand state for the
      //      target card.
      // 120ms gives React a render frame on slower mobile so the
      // scroll lands on the fully-expanded layout instead of the
      // pre-open height.
      window.setTimeout(() => {
        document
          .getElementById('office-help')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
    window.addEventListener(LANTERN_OPEN_THREAD_EVENT, onOpenThread)
    return () =>
      window.removeEventListener(LANTERN_OPEN_THREAD_EVENT, onOpenThread)
    // entries is part of closure -- but openInline is stable, and
    // entries changes on every poll, which would re-attach the
    // listener constantly. We use entryIdsKey as the surrogate
    // identity so the listener only re-attaches when the list of
    // ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campgroundId, previewMode, entryIdsKey, openInline])

  // Render only when there's at least one VISIBLE (non-dismissed)
  // entry. Dismissed entries stay in storage so the poll keeps
  // watching them, but the camper sees nothing until a fresh
  // owner reply re-surfaces the card via undismissCamperMessage.
  if (previewMode || visibleEntries.length === 0) return null

  function hideEntry(entry: LiveEntry) {
    // Soft-hide: stamp dismissedAt + collapse any inline expansion.
    // The poll keeps watching the thread so a fresh owner reply
    // re-surfaces the card automatically.
    dismissCamperMessage(campgroundId, entry.id)
    setThreadById((prev) => {
      const next = { ...prev }
      delete next[entry.id]
      return next
    })
    if (expandedId === entry.id) setExpandedId(null)
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {visibleEntries.map((e) => (
          <CamperMessageCard
            key={e.id}
            entry={e}
            expanded={expandedId === e.id}
            expandedState={threadById[e.id] ?? null}
            onOpen={() => openInline(e)}
            onCollapse={() => setExpandedId(null)}
            onClear={() => hideEntry(e)}
            onReplySent={() => void loadFullThread(e)}
          />
        ))}
      </ul>
    </div>
  )
}

function CamperMessageCard({
  entry,
  expanded,
  expandedState,
  onOpen,
  onCollapse,
  onClear,
  onReplySent,
}: {
  entry: LiveEntry
  expanded: boolean
  expandedState: ExpandedState | null
  onOpen: () => void
  onCollapse: () => void
  onClear: () => void
  onReplySent: () => void
}) {
  const category = entry.category
    ? CATEGORY_LABEL[entry.category] ?? entry.category
    : 'Office message'
  const hasUnreadReply =
    entry.status === 'ok' &&
    entry.latestOwnerReplyAt !== null &&
    (entry.lastSeenReplyAt === null ||
      entry.latestOwnerReplyAt > entry.lastSeenReplyAt)

  const sentAt = formatRelative(entry.submittedAt)

  // Distinct copy for "office replied" vs "still waiting for reply" so
  // a returning camper sees at a glance whether there's something new.
  const title = hasUnreadReply
    ? 'The office replied'
    : entry.ownerReplyCount > 0
      ? 'Your message thread'
      : 'Message sent to the office'
  const body =
    entry.status === 'missing'
      ? 'This thread is no longer available. The link may have expired.'
      : hasUnreadReply
        ? 'The campground office replied to your message.'
        : entry.ownerReplyCount > 0
          ? 'View or send another reply in this thread.'
          : 'You can check for replies from the campground office here.'
  const openLabel = expanded
    ? 'Hide thread'
    : hasUnreadReply
      ? 'View office reply'
      : entry.ownerReplyCount > 0
        ? 'View thread'
        : 'Check replies'

  return (
    <li
      className={
        hasUnreadReply || expanded
          ? 'rounded-2xl border border-flame/40 bg-flame/[0.06] p-4 space-y-3'
          : 'rounded-2xl border border-white/10 bg-card p-4 space-y-3'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="rounded-full bg-white/5 text-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {category}
          </span>
          {hasUnreadReply && (
            <span className="rounded-full bg-flame/20 text-flame px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] border border-flame/40">
              New reply
            </span>
          )}
        </div>
        <span className="text-[10px] text-mist tabular-nums">
          Sent {sentAt}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-cream">{title}</p>
        <p className="text-xs text-mist leading-snug">{body}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={expanded ? onCollapse : onOpen}
          disabled={entry.status === 'missing'}
          className={
            hasUnreadReply && !expanded
              ? 'inline-flex items-center gap-1.5 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
              : 'inline-flex items-center gap-1.5 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-3 py-1.5 text-xs font-semibold hover:bg-leaf/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
          }
        >
          <span aria-hidden>📬</span>
          {openLabel}
        </button>
        <button
          type="button"
          onClick={onClear}
          title="Hide the card from this device. If the office replies later, it will come back automatically."
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-mist px-3 py-1.5 text-xs font-semibold hover:bg-white/10 hover:text-cream transition-colors"
        >
          <span aria-hidden>👁️‍🗨️</span>
          Hide from this page
        </button>
      </div>

      {expanded && (
        <InlineThreadPanel
          entry={entry}
          state={expandedState}
          onReplySent={onReplySent}
        />
      )}
    </li>
  )
}

function InlineThreadPanel({
  entry,
  state,
  onReplySent,
}: {
  entry: LiveEntry
  state: ExpandedState | null
  onReplySent: () => void
}) {
  const [replyBody, setReplyBody] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentNote, setSentNote] = useState(false)

  async function submitReply() {
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
    setSubmitting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.rpc('guest_post_message_reply', {
        _message_id: entry.id,
        _token: entry.token,
        _site_number: entry.siteNumber,
        _last_name: entry.lastName,
        _body: trimmed,
      })
      if (error) {
        setReplyError(error.message)
        return
      }
      setReplyBody('')
      setSentNote(true)
      window.setTimeout(() => setSentNote(false), 4000)
      // Re-fetch so the new guest reply shows up in the thread list
      // without waiting for the 30s polling tick.
      onReplySent()
    } finally {
      setSubmitting(false)
    }
  }

  // Loading shimmer for the initial thread fetch. Subsequent
  // re-fetches (e.g. after a reply) leave the existing thread
  // visible so the camper sees continuity.
  const showSpinner = state?.loading && !state.thread
  const errorOnly = state?.error && !state.thread

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-night/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-flame">
        Private thread with{' '}
        {state?.thread?.campgroundName ?? 'the campground office'}
      </p>

      {showSpinner && (
        <p className="text-xs text-mist italic">Loading thread…</p>
      )}

      {errorOnly && <p className="text-xs text-red-300">{state?.error}</p>}

      {state?.thread && (
        <>
          <div className="rounded-lg border border-white/10 bg-card p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">
                Your original message
              </span>
              <span className="text-[10px] text-mist tabular-nums">
                {formatRelative(state.thread.messageSubmittedAt)}
              </span>
            </div>
            <p className="text-sm text-cream leading-relaxed whitespace-pre-wrap">
              {state.thread.messageBody}
            </p>
          </div>

          {state.thread.replies.length === 0 ? (
            <p className="text-xs text-mist italic">
              No reply from the office yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {state.thread.replies.map((r) => (
                <li
                  key={r.id}
                  className={
                    r.sender === 'owner'
                      ? 'rounded-lg border border-flame/30 bg-flame/[0.06] p-3'
                      : 'rounded-lg border border-leaf/30 bg-leaf/[0.05] p-3'
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

          <div className="space-y-2 rounded-lg border border-flame/30 bg-flame/[0.04] p-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-flame block">
              Reply to the office
            </label>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Write your reply…"
              disabled={submitting}
              className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50 resize-none"
            />
            {replyError && <p className="text-xs text-red-300">{replyError}</p>}
            {sentNote && <p className="text-xs text-leaf">Reply sent.</p>}
            <button
              type="button"
              onClick={submitReply}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-3 py-2 text-xs font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Sending…' : 'Send reply'}
            </button>
          </div>
        </>
      )}
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

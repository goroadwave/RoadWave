'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  CAMPER_MSG_EVENT,
  loadCamperMessages,
  markCamperMessageSeen,
  removeCamperMessage,
  type StoredCamperMessage,
} from '@/components/campgrounds/camper-message-storage'
import {
  LANTERN_MARK_SEEN_EVENT,
  LANTERN_OFFICE_REPLY_EVENT,
} from '@/components/campgrounds/lantern-storage'

// Persistent "Your messages with the office" card list shown above the
// engagement surfaces on the campground welcome page. Drives:
//
//   * Reload-safe restoration of the camper's "Check replies" link
//     (mounted from localStorage entries written by ContactOffice on
//     submit success).
//   * Lightweight polling of guest_message_thread (mig 0055) for each
//     entry while the tab is visible -- gives an "Office replied"
//     in-page banner + a "new reply" indicator on the card.
//   * Clear from this device action -- removes the entry from
//     localStorage (handy on a shared family/RV tablet).
//
// Privacy guardrails:
//   * Scoped per campgroundId; entries for other campgrounds are never
//     read or rendered here.
//   * Polling uses the exact same gate the camper used to submit
//     (token + site + last). A wrong stored value just gets an empty
//     result -- the polling layer never sees data it isn't authorized
//     to see.
//   * Owner inbox is never queried; only the camper's own threads.
//   * No PII (phone, email, owner names) is read into this component.
//
// What we never do:
//   * Show messages for any other camper.
//   * Auto-open the thread page. The camper has to click Check Replies
//     and re-confirm site + last name on /m/[id] (it's pre-filled by
//     the link via the URL pattern? -- NO, the link does not pre-fill;
//     it's still a soft 2FA gate).

type LiveStatus = 'loading' | 'ok' | 'missing'

type LiveEntry = StoredCamperMessage & {
  status: LiveStatus
  ownerReplyCount: number
  latestReplyAt: string | null
  latestOwnerReplyAt: string | null
}

type ThreadRow = {
  message_body: string | null
  message_submitted_at: string | null
  campground_name: string | null
  reply_id: string | null
  reply_sender: 'owner' | 'guest' | null
  reply_body: string | null
  reply_created_at: string | null
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

// Stable subscribe / snapshot helpers for useSyncExternalStore. The
// snapshot returns the raw localStorage *string* so React's identity
// check is stable across renders -- we only re-parse to a fresh array
// when the underlying string actually changes. Parsing inside
// getSnapshot would return a new array reference every call and loop.
function makeSubscribe(campgroundId: string) {
  const expectedKey = `roadwave:office-msgs:${campgroundId}`
  return (notify: () => void) => {
    function onAdded(e: Event) {
      const ce = e as CustomEvent<{ campgroundId?: string }>
      if (ce.detail?.campgroundId === campgroundId) notify()
    }
    function onStorage(e: StorageEvent) {
      if (e.key === expectedKey) notify()
    }
    function onFocus() {
      notify()
    }
    window.addEventListener(CAMPER_MSG_EVENT, onAdded)
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener(CAMPER_MSG_EVENT, onAdded)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }
}

function makeGetSnapshot(campgroundId: string) {
  const key = `roadwave:office-msgs:${campgroundId}`
  return (): string => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(key) ?? ''
  }
}

function getServerSnapshot(): string {
  return ''
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
  // The first client render MUST match SSR (which can't see
  // localStorage). We flip `mounted` after the initial effect so any
  // localStorage entries are picked up only on the second render --
  // this avoids the React 18 hydration mismatch we'd otherwise hit
  // when a returning camper has stored office threads.
  //
  // The eslint disable is intentional: this is the canonical
  // post-hydration sentinel pattern. setState in this effect MUST
  // happen exactly once to transition from "matches SSR" to "reads
  // localStorage", and there's no callback-based alternative.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Subscribe to the raw localStorage string via useSyncExternalStore.
  // The string is the canonical source of truth; we derive the parsed
  // entries from it below with useMemo so the reference stays stable.
  const subscribe = useMemo(() => makeSubscribe(campgroundId), [campgroundId])
  const getSnapshot = useMemo(
    () => makeGetSnapshot(campgroundId),
    [campgroundId],
  )
  const storedRaw = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  // Parsed view of the localStorage entries. previewMode forces it to
  // empty so the owner preview never writes / reads demo entries.
  // !mounted forces it to empty on the very first client render so we
  // match the server-rendered HTML (no localStorage access during SSR).
  const stored = useMemo<StoredCamperMessage[]>(() => {
    if (previewMode || !mounted) return []
    // storedRaw is intentionally part of the dep array even though it
    // isn't referenced inside (we just need to recompute when it
    // changes). loadCamperMessages reads from localStorage itself.
    void storedRaw
    return loadCamperMessages(campgroundId)
  }, [campgroundId, previewMode, mounted, storedRaw])

  // Live polling state, keyed by message id. Separate from the parsed
  // entries so refreshing localStorage doesn't blow away ongoing poll
  // results.
  const [liveById, setLiveById] = useState<
    Record<
      string,
      {
        status: LiveStatus
        ownerReplyCount: number
        latestReplyAt: string | null
        latestOwnerReplyAt: string | null
      }
    >
  >({})
  const [bannerEntryId, setBannerEntryId] = useState<string | null>(null)

  // Phase 3b -- when the Lantern marks notifications seen, drop our
  // in-page "Office replied" banner so the two surfaces stay
  // coordinated. The per-card flame chip is derived from
  // lastSeenReplyAt on each entry and clears naturally on the next
  // openThread call.
  useEffect(() => {
    if (previewMode) return
    function onLanternSeen(e: Event) {
      const ce = e as CustomEvent<{ campgroundId?: string }>
      if (ce.detail?.campgroundId !== campgroundId) return
      setBannerEntryId(null)
    }
    window.addEventListener(LANTERN_MARK_SEEN_EVENT, onLanternSeen)
    return () =>
      window.removeEventListener(LANTERN_MARK_SEEN_EVENT, onLanternSeen)
  }, [campgroundId, previewMode])

  // Merge stored + live into the LiveEntry shape the UI renders.
  const entries: LiveEntry[] = useMemo(
    () =>
      stored.map((s) => {
        const live = liveById[s.id]
        return {
          ...s,
          status: live?.status ?? 'loading',
          ownerReplyCount: live?.ownerReplyCount ?? 0,
          latestReplyAt: live?.latestReplyAt ?? null,
          latestOwnerReplyAt: live?.latestOwnerReplyAt ?? null,
        }
      }),
    [stored, liveById],
  )

  // The poll function fetches the thread for a single entry. Resolves
  // to { ownerReplyCount, latestReplyAt, latestOwnerReplyAt } or
  // { missing: true } if the gate fails (token expired, message
  // deleted, or stored credentials no longer match).
  const pollEntry = useCallback(
    async (
      entry: StoredCamperMessage,
    ): Promise<{
      ownerReplyCount: number
      latestReplyAt: string | null
      latestOwnerReplyAt: string | null
      missing: boolean
    }> => {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .rpc('guest_message_thread', {
          _message_id: entry.id,
          _token: entry.token,
          _site_number: entry.siteNumber,
          _last_name: entry.lastName,
        })
        .returns<ThreadRow[]>()
      if (error) {
        return {
          ownerReplyCount: 0,
          latestReplyAt: null,
          latestOwnerReplyAt: null,
          missing: true,
        }
      }
      const rows = (data ?? []) as ThreadRow[]
      if (rows.length === 0) {
        return {
          ownerReplyCount: 0,
          latestReplyAt: null,
          latestOwnerReplyAt: null,
          missing: true,
        }
      }
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
          if (
            !latestOwnerReplyAt ||
            r.reply_created_at > latestOwnerReplyAt
          ) {
            latestOwnerReplyAt = r.reply_created_at
          }
        }
      }
      return {
        ownerReplyCount,
        latestReplyAt,
        latestOwnerReplyAt,
        missing: false,
      }
    },
    [],
  )

  // Tracks the last seen latestOwnerReplyAt for each entry so we can
  // detect a transition (no banner on the *initial* poll -- we don't
  // want to scream "new reply" the moment the page loads if there
  // already was one from a previous session). The banner only appears
  // when a poll reveals a strictly newer owner reply than what we
  // already had in this component's state.
  const seenOwnerReplyRef = useRef<Map<string, string | null>>(new Map())

  // Polling loop. Visible-only. Cleared and restarted whenever the
  // entry list changes so the poll always sees the latest entries.
  useEffect(() => {
    if (previewMode) return
    if (entries.length === 0) return

    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      if (cancelled) return
      if (document.visibilityState !== 'visible') {
        // Just re-arm later; no fetches while tab is hidden.
        timerId = setTimeout(tick, POLL_INTERVAL_MS)
        return
      }
      // Poll the first few entries (1-3 is the realistic case). We cap
      // at 3 so a misbehaving local storage with many stale entries
      // can't drown the welcome page in network calls.
      const toPoll = entries.slice(0, 3)
      const results = await Promise.all(
        toPoll.map(async (e) => ({ id: e.id, res: await pollEntry(e) })),
      )
      if (cancelled) return

      let firedBannerFor: string | null = null
      const updates: Record<string, {
        status: LiveStatus
        ownerReplyCount: number
        latestReplyAt: string | null
        latestOwnerReplyAt: string | null
      }> = {}
      for (const { id, res } of results) {
        const wasLatest = seenOwnerReplyRef.current.get(id)
        // First poll for an entry: record without firing the banner.
        // Later polls: fire the banner if the latest owner reply ts
        // strictly advanced.
        if (
          wasLatest !== undefined &&
          wasLatest !== null &&
          res.latestOwnerReplyAt &&
          res.latestOwnerReplyAt > wasLatest
        ) {
          firedBannerFor = id
        }
        seenOwnerReplyRef.current.set(id, res.latestOwnerReplyAt)
        updates[id] = {
          status: res.missing ? 'missing' : 'ok',
          ownerReplyCount: res.ownerReplyCount,
          latestReplyAt: res.latestReplyAt,
          latestOwnerReplyAt: res.latestOwnerReplyAt,
        }
      }
      setLiveById((prev) => ({ ...prev, ...updates }))
      if (firedBannerFor) {
        setBannerEntryId(firedBannerFor)
        // Phase 3b -- nudge the Lantern that a new reply landed. The
        // Lantern recomputes its unread state from the existing
        // tracker localStorage entries (lastSeenReplyAt === null
        // => unread). We just fire so the Lantern re-runs the
        // derivation without polling on its own.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(LANTERN_OFFICE_REPLY_EVENT, {
              detail: { campgroundId, threadId: firedBannerFor },
            }),
          )
        }
      }

      timerId = setTimeout(tick, POLL_INTERVAL_MS)
    }

    // Kick off the first poll right away so the card transitions out
    // of "loading" within ~1s of mount.
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
    // Re-poll loop when entries change identity. We compare by ids so
    // the loop doesn't restart when polling itself updates the
    // ownerReplyCount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.id).join('|'), previewMode, pollEntry])

  if (previewMode || entries.length === 0) return null

  const banner = bannerEntryId
    ? entries.find((e) => e.id === bannerEntryId)
    : null

  function openThread(entry: LiveEntry) {
    if (entry.latestReplyAt) {
      markCamperMessageSeen(campgroundId, entry.id, entry.latestReplyAt)
    }
    setBannerEntryId(null)
    // Clear the "new reply" indicator locally; the next poll will
    // re-derive it from the (now-updated) lastSeenReplyAt in storage.
    setLiveById((prev) => {
      const live = prev[entry.id]
      if (!live) return prev
      return { ...prev, [entry.id]: { ...live, latestOwnerReplyAt: null } }
    })
    // Append &from=<slug> when we know it so the /m/[id] page can
    // render the "Back to campground page" link. The thread page
    // validates the slug before linking to /campground/<slug>.
    const fromParam = entry.campgroundSlug
      ? `&from=${encodeURIComponent(entry.campgroundSlug)}`
      : ''
    window.open(
      `/m/${encodeURIComponent(entry.id)}?t=${encodeURIComponent(entry.token)}${fromParam}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  function clearEntry(entry: LiveEntry) {
    removeCamperMessage(campgroundId, entry.id)
    setLiveById((prev) => {
      const next = { ...prev }
      delete next[entry.id]
      return next
    })
    seenOwnerReplyRef.current.delete(entry.id)
    if (bannerEntryId === entry.id) setBannerEntryId(null)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Your messages with the office
      </h2>

      {banner && (
        <div className="rounded-2xl border border-flame/40 bg-flame/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-cream">
              The office replied
            </p>
            <p className="text-xs text-mist leading-snug">
              The campground office replied to your message.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openThread(banner)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold hover:bg-amber-400 transition-colors"
            >
              <span aria-hidden>📬</span>
              View office reply
            </button>
            <button
              type="button"
              onClick={() => setBannerEntryId(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-cream px-3 py-1.5 text-xs font-semibold hover:bg-white/10 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {entries.map((e) => (
          <CamperMessageCard
            key={e.id}
            entry={e}
            onOpen={() => openThread(e)}
            onClear={() => clearEntry(e)}
          />
        ))}
      </ul>
    </section>
  )
}

function CamperMessageCard({
  entry,
  onOpen,
  onClear,
}: {
  entry: LiveEntry
  onOpen: () => void
  onClear: () => void
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
    : 'Message sent to the office'
  const body =
    entry.status === 'missing'
      ? 'This thread is no longer available. The link may have expired.'
      : hasUnreadReply
        ? 'The campground office replied to your message.'
        : 'You can check for replies from the campground office here.'
  const buttonLabel = hasUnreadReply ? 'View office reply' : 'Check replies'
  const buttonClass = hasUnreadReply
    ? 'inline-flex items-center gap-1.5 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
    : 'inline-flex items-center gap-1.5 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-3 py-1.5 text-xs font-semibold hover:bg-leaf/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

  return (
    <li
      className={
        hasUnreadReply
          ? 'rounded-2xl border border-flame/40 bg-flame/[0.06] p-4 space-y-2'
          : 'rounded-2xl border border-white/10 bg-card p-4 space-y-2'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="rounded-full bg-white/5 text-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {category}
          </span>
          {hasUnreadReply && (
            <span className="rounded-full bg-flame/20 text-flame px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] border border-flame/40">
              The office replied
            </span>
          )}
        </div>
        <span className="text-[10px] text-mist tabular-nums">Sent {sentAt}</span>
      </div>

      <p className="text-sm font-semibold text-cream">{title}</p>
      <p className="text-xs text-mist leading-snug">{body}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={entry.status === 'missing'}
          className={buttonClass}
        >
          <span aria-hidden>📬</span>
          {buttonLabel}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 text-mist px-3 py-1.5 text-xs font-semibold hover:bg-white/10 hover:text-cream transition-colors"
        >
          <span aria-hidden>🗑️</span>
          Clear from this device
        </button>
      </div>
    </li>
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

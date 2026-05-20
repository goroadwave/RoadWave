'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadCamperMessages } from '@/components/campgrounds/camper-message-storage'
import {
  LANTERN_BULLETINS_EVENT,
  LANTERN_CRITICAL_EVENT,
  LANTERN_MARK_SEEN_EVENT,
  LANTERN_MEETUPS_EVENT,
  LANTERN_OFFICE_REPLY_EVENT,
  loadAckedCriticalIds,
  loadLanternSeen,
  saveLanternSeen,
} from '@/components/campgrounds/lantern-storage'

// Phase 3b -- Lantern. Small in-header notification surface that
// lights up with a count when there's something new the camper
// hasn't seen yet. Designed to be calm: dim by default, no popups,
// no full-screen takeover. Tap the icon -> small dropdown panel
// listing unread items. Tap an item -> go to it + mark seen. Tap
// outside -> close panel + mark all listed items seen.
//
// What lights it up:
//   * New bulletins (compared against bulletinSeenThrough cursor)
//   * New meetups (compared against meetupSeenThrough cursor)
//   * New office replies (one per thread, from StoredCamperMessage
//     entries in localStorage where latestOwnerReplyAt >
//     lastSeenReplyAt)
//
// Critical weather notices land in Phase 3c (waiting on mig 0058).
//
// Polling: NONE. The Lantern subscribes to events fired by the
// existing pollers (BulletinsList, MeetupsList, CamperMessageTracker)
// so a single source of truth feeds every consumer. The event detail
// carries the latest data the consumer needs to recompute state
// without making another network call.
//
// Hydration: the icon renders with a static "dim, no count" shell on
// the server. The post-mount effect reads localStorage and hydrates
// the unread count + lit/dim state. No mismatch between server and
// first-client paint.
//
// previewMode={true} (owner /owner/preview): the Lantern renders but
// stays empty -- no localStorage entries, no event subscriptions,
// no real camper state. Avoids polluting the owner's localStorage.

type ReplyItem = {
  kind: 'reply'
  id: string
  threadId: string
  token: string
  campgroundSlug: string | null
  occurredAt: string
  category: string | null
}

type BulletinItem = {
  kind: 'bulletin'
  id: string
  occurredAt: string
  preview: string
}

type MeetupItem = {
  kind: 'meetup'
  id: string
  occurredAt: string
  title: string
}

type CriticalItem = {
  kind: 'critical'
  id: string
  occurredAt: string
  preview: string
}

type LanternItem = ReplyItem | BulletinItem | MeetupItem | CriticalItem

type DynamicPayload = {
  bulletins?: { id: string; message: string; created_at: string }[]
  meetups?: { id: string; title: string; start_at: string }[]
  critical?: {
    id: string
    message: string
    expires_at: string | null
    created_at: string
  } | null
}

const CATEGORY_PREVIEW: Record<string, string> = {
  wifi: 'Wi-Fi issue',
  maintenance: 'Maintenance issue',
  noise: 'Noise concern',
  bathroom_laundry: 'Bathroom / laundry issue',
  late_checkout: 'Late checkout question',
  general_question: 'General question',
  compliment: 'Compliment',
  suggestion: 'Suggestion',
  safety_concern: 'Safety concern',
}

export function Lantern({
  campgroundId,
  campgroundSlug,
  previewMode = false,
}: {
  campgroundId: string
  campgroundSlug: string
  /** Owner /owner/preview mounts this component too. Keep the
   *  shell visible but skip all camper localStorage reads + event
   *  subscriptions so a preview never lights up from real data. */
  previewMode?: boolean
}) {
  // Post-mount flag to avoid hydration mismatch -- the SSR shell
  // shows dim/no-count; the client-after-mount reads localStorage
  // and re-renders with the real state.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Items the Lantern currently knows about. The state shape lets
  // us recompute unread without re-fetching:
  //   * bulletinList / meetupList: latest payload from the poll
  //     events (or the SSR initial via separate hydration on mount).
  //   * trackerVersion: bumped each time the tracker dispatches a
  //     reply event so the office-reply derivation re-runs.
  //   * seen: localStorage cursors for bulletins + meetups.
  const [bulletinList, setBulletinList] = useState<
    { id: string; message: string; created_at: string }[]
  >([])
  const [meetupList, setMeetupList] = useState<
    { id: string; title: string; start_at: string }[]
  >([])
  const [trackerVersion, setTrackerVersion] = useState(0)
  const [seen, setSeen] = useState(() => ({
    bulletinSeenThrough: null as string | null,
    meetupSeenThrough: null as string | null,
  }))
  // Phase 3c -- active critical bulletin (or null). The Lantern
  // counts it as unread in the badge ONLY while it's not yet
  // acknowledged by the camper (acked ids tracked separately so a
  // dismissed critical stays visible in the panel list as a pinned
  // item but stops contributing to the badge count).
  const [critical, setCritical] = useState<{
    id: string
    message: string
    created_at: string
  } | null>(null)
  const [ackedCriticalIds, setAckedCriticalIds] = useState<Set<string>>(
    () => new Set(),
  )

  const [panelOpen, setPanelOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Initial hydration: pull current seen-cursors + an initial fetch
  // of the dynamic payload so we have data to compute unread even
  // before the next BulletinsList / MeetupsList poll fires. The
  // existing pollers will keep us fresh after that.
  //
  // Restructured around an async inner function so the setState
  // calls run in an awaited callback (recognized by
  // react-hooks/set-state-in-effect) rather than a fire-and-forget
  // promise chain in the effect body.
  useEffect(() => {
    if (!mounted || previewMode) return
    let cancelled = false

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(loadLanternSeen(campgroundId))
    setAckedCriticalIds(loadAckedCriticalIds(campgroundId))

    async function loadDynamic() {
      try {
        const res = await fetch(
          `/api/campground/${encodeURIComponent(campgroundSlug)}/dynamic`,
          { cache: 'no-store' },
        )
        if (!res.ok) return
        const json: DynamicPayload = await res.json()
        if (cancelled) return
        if (Array.isArray(json.bulletins)) setBulletinList(json.bulletins)
        if (Array.isArray(json.meetups)) setMeetupList(json.meetups)
        // Phase 3c -- pick up the current critical so the badge
        // count is accurate before the next poll fires.
        if (json.critical !== undefined) {
          setCritical(
            json.critical
              ? {
                  id: json.critical.id,
                  message: json.critical.message,
                  created_at: json.critical.created_at,
                }
              : null,
          )
        }
      } catch {
        // Background fetch -- silently degrade.
      }
    }
    void loadDynamic()

    return () => {
      cancelled = true
    }
  }, [mounted, previewMode, campgroundId, campgroundSlug])

  // Subscribe to the three event sources.
  useEffect(() => {
    if (!mounted || previewMode) return

    function onBulletins(e: Event) {
      const ce = e as CustomEvent<{
        campgroundId?: string
        bulletins?: { id: string; message: string; created_at: string }[]
      }>
      if (ce.detail?.campgroundId !== campgroundId) return
      if (Array.isArray(ce.detail.bulletins)) {
        setBulletinList(ce.detail.bulletins)
      }
    }

    function onMeetups(e: Event) {
      const ce = e as CustomEvent<{
        campgroundId?: string
        meetups?: { id: string; title: string; start_at: string }[]
      }>
      if (ce.detail?.campgroundId !== campgroundId) return
      if (Array.isArray(ce.detail.meetups)) setMeetupList(ce.detail.meetups)
    }

    function onReply(e: Event) {
      const ce = e as CustomEvent<{ campgroundId?: string }>
      if (ce.detail?.campgroundId !== campgroundId) return
      setTrackerVersion((v) => v + 1)
    }

    // Phase 3c -- critical bulletin updates from BulletinsList's
    // poll. detail.critical is null when there's no active critical
    // (e.g. the owner removed it or it expired).
    function onCritical(e: Event) {
      const ce = e as CustomEvent<{
        campgroundId?: string
        critical?: {
          id: string
          message: string
          created_at: string
        } | null
      }>
      if (ce.detail?.campgroundId !== campgroundId) return
      const next = ce.detail.critical ?? null
      setCritical(next)
      // Refresh acked ids on every critical change in case the
      // CriticalBanner just wrote a new one to localStorage.
      setAckedCriticalIds(loadAckedCriticalIds(campgroundId))
    }

    // Refresh acked ids whenever the CriticalBanner writes one
    // (same-tab writes don't fire the storage event, so the
    // CriticalBanner's acknowledge() doesn't automatically tell us
    // -- but onCritical above + the storage event below cover the
    // common cases).
    function onStorage(e: StorageEvent) {
      if (e.key === `roadwave:critical-ack:${campgroundId}`) {
        setAckedCriticalIds(loadAckedCriticalIds(campgroundId))
      }
    }

    window.addEventListener(LANTERN_BULLETINS_EVENT, onBulletins)
    window.addEventListener(LANTERN_MEETUPS_EVENT, onMeetups)
    window.addEventListener(LANTERN_OFFICE_REPLY_EVENT, onReply)
    window.addEventListener(LANTERN_CRITICAL_EVENT, onCritical)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LANTERN_BULLETINS_EVENT, onBulletins)
      window.removeEventListener(LANTERN_MEETUPS_EVENT, onMeetups)
      window.removeEventListener(LANTERN_OFFICE_REPLY_EVENT, onReply)
      window.removeEventListener(LANTERN_CRITICAL_EVENT, onCritical)
      window.removeEventListener('storage', onStorage)
    }
  }, [mounted, previewMode, campgroundId])

  // Derived items. Bulletins/meetups compared against the
  // seen-through timestamp; office replies derived from the stored
  // camper message entries (which the tracker already maintains);
  // critical bulletin pinned as long as it's active. The badge
  // count is a SEPARATE derivation -- it excludes critical items
  // that have been acknowledged but still includes them in the
  // panel list as pinned entries (per Q6 = 6a).
  const items: LanternItem[] = useMemo(() => {
    if (!mounted || previewMode) return []
    const out: LanternItem[] = []

    // Critical bulletin pin -- always at the top of the panel
    // while active, regardless of acked state. The badge derivation
    // below decides whether it contributes to the count.
    if (critical) {
      out.push({
        kind: 'critical',
        id: critical.id,
        occurredAt: critical.created_at,
        preview: critical.message.slice(0, 80),
      })
    }

    // Bulletins newer than seen cursor.
    const bSeen = seen.bulletinSeenThrough
    for (const b of bulletinList) {
      if (!bSeen || b.created_at > bSeen) {
        out.push({
          kind: 'bulletin',
          id: b.id,
          occurredAt: b.created_at,
          preview: b.message.slice(0, 80),
        })
      }
    }

    // Meetups newer than seen cursor. Use start_at as the monotone
    // signal -- it's what the list orders by + what determines
    // "still upcoming".
    const mSeen = seen.meetupSeenThrough
    for (const m of meetupList) {
      if (!mSeen || m.start_at > mSeen) {
        out.push({
          kind: 'meetup',
          id: m.id,
          occurredAt: m.start_at,
          title: m.title,
        })
      }
    }

    // Office replies -- per-thread unread state from the existing
    // camper-message-storage. trackerVersion is a dependency so this
    // re-runs whenever the tracker dispatches an event.
    void trackerVersion
    const threads = loadCamperMessages(campgroundId)
    for (const t of threads) {
      // We don't store latestOwnerReplyAt in the tracker entry --
      // only lastSeenReplyAt. The signal that a reply is unread is
      // computed in the tracker by comparing the polled thread
      // payload against lastSeenReplyAt. The Lantern event-fires
      // when the tracker DETECTS this, so we treat the existence of
      // an unseen reply as "this thread has occurredAt = now()" for
      // display ordering. (The exact reply timestamp is in the
      // tracker; surfacing it in the Lantern would require teaching
      // the event to carry it. Acceptable for v1.)
      //
      // Simplest correct check: trust the tracker to fire only when
      // a NEW reply is detected. Each tracker fire bumps
      // trackerVersion; we synthesize a reply item per thread that
      // the tracker says is unread. The tracker's own per-thread
      // unread state lives in its component; the Lantern can
      // approximate by counting threads whose lastSeenReplyAt is
      // either null OR older than ~recent.
      //
      // For now: render one item per thread that has any
      // lastSeenReplyAt === null. After the camper opens the
      // thread (which sets lastSeenReplyAt via the tracker's
      // openThread handler) the item drops off the Lantern on the
      // next render.
      //
      // This matches the spec "one office thread should only create
      // one visible persistent message card" + "Lantern items
      // include office replies".
      if (t.lastSeenReplyAt === null) {
        // Use submittedAt as the display timestamp -- the actual
        // reply time isn't available without re-polling, and using
        // submittedAt prevents the Lantern item from looking newer
        // than the tracker card (which uses submittedAt too).
        out.push({
          kind: 'reply',
          id: `reply-${t.id}`,
          threadId: t.id,
          token: t.token,
          campgroundSlug: t.campgroundSlug,
          occurredAt: t.submittedAt,
          category: t.category,
        })
      }
    }

    // Newest first -- EXCEPT the critical bulletin which stays at
    // the top regardless of its timestamp. We sort the non-critical
    // tail, then re-prepend the critical if there was one.
    const criticalItem = out.find((it) => it.kind === 'critical') ?? null
    const others = out.filter((it) => it.kind !== 'critical')
    others.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    return criticalItem ? [criticalItem, ...others] : others
  }, [
    mounted,
    previewMode,
    campgroundId,
    bulletinList,
    meetupList,
    seen,
    trackerVersion,
    critical,
  ])

  // Badge count -- like items.length, but excludes critical items
  // the camper has already acknowledged. Acked critical stays
  // visible in the panel as a pinned item; it just no longer
  // contributes to the "unread" badge.
  const unreadBadgeCount = useMemo(() => {
    let count = 0
    for (const it of items) {
      if (it.kind === 'critical' && ackedCriticalIds.has(it.id)) continue
      count += 1
    }
    return count
  }, [items, ackedCriticalIds])

  // Compute "latest bulletin / meetup created_at" so marking seen
  // can capture the right cursor without missing items that arrive
  // mid-session.
  const latestBulletinTs = useMemo(() => {
    return bulletinList.reduce<string | null>(
      (acc, b) => (acc === null || b.created_at > acc ? b.created_at : acc),
      null,
    )
  }, [bulletinList])

  const latestMeetupTs = useMemo(() => {
    return meetupList.reduce<string | null>(
      (acc, m) => (acc === null || m.start_at > acc ? m.start_at : acc),
      null,
    )
  }, [meetupList])

  // Mark all currently-visible items seen. Updates the localStorage
  // cursors AND fires LANTERN_MARK_SEEN_EVENT so the tracker can
  // also clear its in-page banner + card chip in lockstep.
  const markAllSeen = useCallback(() => {
    if (previewMode) return
    const next = {
      bulletinSeenThrough: latestBulletinTs ?? seen.bulletinSeenThrough,
      meetupSeenThrough: latestMeetupTs ?? seen.meetupSeenThrough,
    }
    saveLanternSeen(campgroundId, next)
    setSeen(next)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(LANTERN_MARK_SEEN_EVENT, {
          detail: { campgroundId },
        }),
      )
    }
  }, [previewMode, campgroundId, latestBulletinTs, latestMeetupTs, seen])

  // Click-outside-to-close: only attach the listener while open.
  useEffect(() => {
    if (!panelOpen) return
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null
      if (!target) return
      if (buttonRef.current && buttonRef.current.contains(target)) return
      if (panelRef.current && panelRef.current.contains(target)) return
      setPanelOpen(false)
      markAllSeen()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [panelOpen, markAllSeen])

  const unreadCount = unreadBadgeCount

  function openItem(item: LanternItem) {
    if (item.kind === 'reply') {
      const fromParam = item.campgroundSlug
        ? `&from=${encodeURIComponent(item.campgroundSlug)}`
        : ''
      window.open(
        `/m/${encodeURIComponent(item.threadId)}?t=${encodeURIComponent(item.token)}${fromParam}`,
        '_blank',
        'noopener,noreferrer',
      )
    } else if (item.kind === 'bulletin') {
      // scrollIntoView instead of writing window.location.hash --
      // the location-property write trips react-hooks/immutability,
      // and scrolling directly to the section element is the
      // behavior we actually want (no URL fragment side effect that
      // sticks around in browser history).
      document
        .getElementById('bulletins')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (item.kind === 'meetup') {
      document
        .getElementById('meetups')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // Critical bulletin -- scroll to the top so the camper sees
      // the prominent banner (or its acked chip). The CriticalBanner
      // lives above the welcome section.
      document
        .getElementById('critical-notice')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setPanelOpen(false)
    markAllSeen()
  }

  // Styling tokens. The pulse animation only fires when unread > 0
  // AND the user hasn't opted out of motion. The CSS rule lives in
  // globals.css (.lantern-pulse + reduced-motion override).
  const buttonClass = unreadCount > 0 ? 'lantern-pulse' : ''

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const willOpen = !panelOpen
          setPanelOpen(willOpen)
          if (!willOpen) markAllSeen()
        }}
        aria-label={
          unreadCount > 0
            ? `Notifications -- ${unreadCount} new`
            : 'Notifications'
        }
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors ${
          unreadCount > 0
            ? 'bg-flame/15 border border-flame/40 text-flame hover:bg-flame/20'
            : 'border border-white/10 text-mist hover:text-cream hover:border-white/20'
        } ${buttonClass}`}
      >
        <span aria-hidden className="text-base leading-none">
          🏮
        </span>
        {unreadCount > 0 && (
          <span className="text-[11px] font-semibold tabular-nums">
            {unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-card shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
              Recent
            </p>
            <button
              type="button"
              onClick={() => {
                setPanelOpen(false)
                markAllSeen()
              }}
              className="text-[11px] text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              Close
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-mist">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors flex items-start gap-3"
                  >
                    <span aria-hidden className="text-base leading-none mt-0.5">
                      {item.kind === 'reply'
                        ? '📬'
                        : item.kind === 'bulletin'
                          ? '📣'
                          : item.kind === 'meetup'
                            ? '📅'
                            : '⚠'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={
                          item.kind === 'critical'
                            ? 'block text-sm font-bold text-red-200 leading-tight'
                            : 'block text-sm font-semibold text-cream leading-tight'
                        }
                      >
                        {item.kind === 'reply'
                          ? 'The office replied'
                          : item.kind === 'bulletin'
                            ? 'New announcement'
                            : item.kind === 'meetup'
                              ? 'New meetup'
                              : 'Weather & safety notice'}
                      </span>
                      <span className="block text-xs text-mist mt-0.5 leading-snug line-clamp-2">
                        {item.kind === 'reply'
                          ? item.category
                            ? `Your ${CATEGORY_PREVIEW[item.category] ?? 'message'}`
                            : 'Your message'
                          : item.kind === 'bulletin'
                            ? item.preview
                            : item.kind === 'meetup'
                              ? item.title
                              : item.preview}
                      </span>
                      <span className="block text-[10px] text-mist/70 mt-1 tabular-nums">
                        {formatRelative(item.occurredAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <div className="px-4 py-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  markAllSeen()
                  setPanelOpen(false)
                }}
                className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
              >
                Mark all seen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatRelative(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffMs = Date.now() - t
  const absMs = Math.abs(diffMs)
  const min = Math.floor(absMs / 60_000)
  const future = diffMs < 0
  if (min < 1) return future ? 'soon' : 'just now'
  if (min < 60) return future ? `in ${min}m` : `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return future ? `in ${hr}h` : `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return future ? `in ${days}d` : `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

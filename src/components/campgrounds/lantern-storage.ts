// Phase 3b -- Lantern storage + cross-component event names.
//
// Lantern "seen" state lives entirely in localStorage on the camper's
// device (per the Phase 3 spec: no server-side notification table).
// One key per campground:
//
//   roadwave:lantern-seen:<campgroundId> = {
//     bulletinSeenThrough: ISO timestamp | null,
//     meetupSeenThrough:   ISO timestamp | null,
//   }
//
// "Seen through" is a single monotone timestamp per type. Anything
// with created_at > seenThrough is considered unread. Cheap to store,
// cheap to compare, and can't drift the way a set of ids could.
//
// Office-reply "seen" state lives in the existing roadwave:office-msgs:*
// store (StoredCamperMessage.lastSeenReplyAt). The Lantern READS that
// store; it does not duplicate the data.
//
// Event bus
// ---------
// The list components (BulletinsList, MeetupsList) and the tracker
// already poll for fresh data; the Lantern subscribes to their
// updates via custom events on `window` instead of polling itself.
// Loose coupling matches the existing CAMPER_MSG_EVENT pattern.

export type LanternSeen = {
  bulletinSeenThrough: string | null
  meetupSeenThrough: string | null
}

const EMPTY_SEEN: LanternSeen = {
  bulletinSeenThrough: null,
  meetupSeenThrough: null,
}

function storageKey(campgroundId: string): string {
  return `roadwave:lantern-seen:${campgroundId}`
}

export function loadLanternSeen(campgroundId: string): LanternSeen {
  if (typeof window === 'undefined') return EMPTY_SEEN
  try {
    const raw = window.localStorage.getItem(storageKey(campgroundId))
    if (!raw) return EMPTY_SEEN
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return EMPTY_SEEN
    const r = parsed as Record<string, unknown>
    return {
      bulletinSeenThrough:
        typeof r.bulletinSeenThrough === 'string'
          ? r.bulletinSeenThrough
          : null,
      meetupSeenThrough:
        typeof r.meetupSeenThrough === 'string' ? r.meetupSeenThrough : null,
    }
  } catch {
    return EMPTY_SEEN
  }
}

export function saveLanternSeen(
  campgroundId: string,
  next: LanternSeen,
): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(campgroundId), JSON.stringify(next))
  } catch {
    // Storage quota / disabled -- silently degrade; in-memory state
    // still works for the rest of the session.
  }
}

// Event names. Dispatched on `window` with a CustomEvent detail
// describing what changed. The Lantern listens for all three; the
// dispatching component fires after a successful poll-driven state
// update so the Lantern can recompute unread counts without doing
// its own polling.

// Fired by BulletinsList after a poll that changed the list shape.
// detail: { campgroundId, latestCreatedAt: string | null }
export const LANTERN_BULLETINS_EVENT = 'roadwave:lantern-bulletins'

// Fired by MeetupsList after a poll that changed the list shape.
// detail: { campgroundId, latestCreatedAt: string | null }
//
// (Meetups don't have a created_at -- they have start_at + end_at.
// For the Lantern's "new since seen" check, we use start_at as the
// monotone cursor, which is also what's already used for ordering
// in the page.)
export const LANTERN_MEETUPS_EVENT = 'roadwave:lantern-meetups'

// Fired by CamperMessageTracker each time it polls and detects that
// any thread's latestOwnerReplyAt has changed. detail:
// { campgroundId, threadId, latestOwnerReplyAt, lastSeenReplyAt }
//
// The Lantern itself derives unread state from comparing
// latestOwnerReplyAt > lastSeenReplyAt. Marking seen is done by the
// existing markCamperMessageSeen helper in camper-message-storage;
// the Lantern dispatches a separate event to nudge the tracker to
// refresh its in-memory state after a Lantern-side "mark all seen".
export const LANTERN_OFFICE_REPLY_EVENT = 'roadwave:lantern-office-reply'

// Fired by the Lantern when the camper marks items seen. The tracker
// listens so its in-page "Office replied" banner + card chip can
// clear at the same time. detail: { campgroundId }
export const LANTERN_MARK_SEEN_EVENT = 'roadwave:lantern-mark-seen'

// Phase 3c -- fired by BulletinsList when the active is_critical
// bulletin in the polled payload changes (different id, different
// expires_at, or appeared/disappeared). detail:
// { campgroundId, critical: CriticalPayload | null }
//
// CriticalBanner subscribes to render the prominent red banner; the
// Lantern subscribes to add a "critical" item to its unread list
// (until the camper acknowledges it via the banner's Dismiss).
export const LANTERN_CRITICAL_EVENT = 'roadwave:lantern-critical'

// Per-campground localStorage of acknowledged critical bulletin ids.
// Acknowledgement collapses the prominent red banner to a quieter
// pinned chip; it does NOT remove the notice (the spec says it
// stays accessible/pinned while active). The Lantern stops counting
// an acknowledged critical in its unread badge but still lists it
// in the panel as long as the bulletin is active.
//
// Storage key: roadwave:critical-ack:<campgroundId>
// Value: JSON array of acknowledged bulletin ids. Bounded by the
// natural turnover of bulletins -- old ids get pruned as the
// banner only ever checks against the currently-active critical id.

function ackStorageKey(campgroundId: string): string {
  return `roadwave:critical-ack:${campgroundId}`
}

export function loadAckedCriticalIds(campgroundId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(ackStorageKey(campgroundId))
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((v): v is string => typeof v === 'string'))
  } catch {
    return new Set()
  }
}

export function addAckedCriticalId(
  campgroundId: string,
  bulletinId: string,
): void {
  if (typeof window === 'undefined') return
  try {
    const current = loadAckedCriticalIds(campgroundId)
    current.add(bulletinId)
    // Keep the list bounded -- if it ever gets unreasonably large,
    // an old bulletin id whose acknowledgement we still remember
    // is harmless (the active critical check only ever compares
    // against the currently-returned id), so we don't need to
    // proactively prune.
    window.localStorage.setItem(
      ackStorageKey(campgroundId),
      JSON.stringify([...current]),
    )
  } catch {
    // Quota / disabled storage -- the in-session state still works.
  }
}

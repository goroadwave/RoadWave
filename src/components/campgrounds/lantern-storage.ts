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

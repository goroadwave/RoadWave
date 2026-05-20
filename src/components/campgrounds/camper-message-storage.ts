// Browser-only persistence for "I sent the office a message" entries.
// Backs the persistent CamperMessageTracker card on the campground
// welcome page so the camper can return to their private reply thread
// after a reload / browser close / device sleep.
//
// Storage shape (one key per campground, JSON array):
//   roadwave:office-msgs:<campgroundId> = [
//     {
//       id:               string  // message uuid
//       token:            string  // guest_reply_token from /api/campground/message
//       siteNumber:       string  // soft-2FA factor required by RPC gate
//       lastName:         string  // soft-2FA factor required by RPC gate
//       category:         string | null
//       submittedAt:      string  // ISO from server
//       lastSeenReplyAt:  string | null  // updated when camper opens the thread
//     },
//     ...
//   ]
//
// What we DO NOT store: phone, email, message body, owner inbox data,
// any other camper's data. Site number + last name are the camper's own
// information that they typed into the form on this device -- required
// here because the guest_message_thread / guest_post_message_reply RPCs
// (mig 0055) require all three of {token, site, last} to match.

export type StoredCamperMessage = {
  id: string
  token: string
  siteNumber: string
  lastName: string
  category: string | null
  submittedAt: string
  lastSeenReplyAt: string | null
  /** The campground slug the camper submitted from. Used to build the
   *  "Back to campground page" link on the /m/[id] thread page. NULL
   *  for entries written before this field existed (legacy rows
   *  pre-2026-05-21); the thread page falls back to "/" in that case. */
  campgroundSlug: string | null
}

// Custom event the tracker subscribes to so it can re-read localStorage
// without polling for storage changes. Same-tab writes don't fire the
// browser's native 'storage' event, so we synthesize this one.
export const CAMPER_MSG_EVENT = 'roadwave:office-msg-added'

function storageKey(campgroundId: string): string {
  return `roadwave:office-msgs:${campgroundId}`
}

export function loadCamperMessages(
  campgroundId: string,
): StoredCamperMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(campgroundId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const normalized = parsed
      .filter((e): e is Record<string, unknown> => {
        if (!e || typeof e !== 'object') return false
        const r = e as Record<string, unknown>
        return (
          typeof r.id === 'string' &&
          typeof r.token === 'string' &&
          typeof r.siteNumber === 'string' &&
          typeof r.lastName === 'string' &&
          typeof r.submittedAt === 'string'
        )
      })
      .map<StoredCamperMessage>((r) => ({
        id: r.id as string,
        token: r.token as string,
        siteNumber: r.siteNumber as string,
        lastName: r.lastName as string,
        category: typeof r.category === 'string' ? r.category : null,
        submittedAt: r.submittedAt as string,
        lastSeenReplyAt:
          typeof r.lastSeenReplyAt === 'string' ? r.lastSeenReplyAt : null,
        // Legacy entries written before campgroundSlug existed get null
        // and the thread page falls back to a safe default.
        campgroundSlug:
          typeof r.campgroundSlug === 'string' ? r.campgroundSlug : null,
      }))

    // Dedupe by message id. Legacy localStorage states from earlier
    // buggy builds could carry duplicate ids -- the tracker would
    // render the same message twice. We keep the earliest occurrence
    // (lower index) since the list order is "newest first" by
    // appendCamperMessage convention, so the first-seen id IS the
    // most recent write. The lastSeenReplyAt field is merged: any
    // entry with a non-null lastSeenReplyAt wins so we don't lose
    // "already seen" state from a stale duplicate.
    const seen = new Map<string, StoredCamperMessage>()
    for (const e of normalized) {
      const prior = seen.get(e.id)
      if (!prior) {
        seen.set(e.id, e)
      } else if (!prior.lastSeenReplyAt && e.lastSeenReplyAt) {
        seen.set(e.id, { ...prior, lastSeenReplyAt: e.lastSeenReplyAt })
      }
    }
    const deduped = [...seen.values()]

    // Sanitize-write-back: if dedup actually changed anything, push the
    // cleaned array back to localStorage so the next load is cheap and
    // inspectable. Guarded so we don't write on every page load.
    if (deduped.length !== parsed.length || deduped.length !== normalized.length) {
      try {
        const key = storageKey(campgroundId)
        if (deduped.length === 0) {
          window.localStorage.removeItem(key)
        } else {
          window.localStorage.setItem(key, JSON.stringify(deduped))
        }
      } catch {
        // Quota / disabled storage -- the in-memory dedup still works,
        // we just don't get the persistence-side cleanup.
      }
    }

    return deduped
  } catch {
    return []
  }
}

export function saveCamperMessages(
  campgroundId: string,
  entries: StoredCamperMessage[],
): void {
  if (typeof window === 'undefined') return
  try {
    const key = storageKey(campgroundId)
    if (entries.length === 0) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, JSON.stringify(entries))
    }
  } catch {
    // localStorage may be unavailable (Safari private mode quota,
    // disabled storage). Silently degrade -- the immediate-after-submit
    // confirmation card still renders from in-memory state.
  }
}

export function appendCamperMessage(
  campgroundId: string,
  entry: StoredCamperMessage,
): void {
  const existing = loadCamperMessages(campgroundId)
  // Dedupe by message id -- a re-submit shouldn't double up.
  const next = [
    entry,
    ...existing.filter((e) => e.id !== entry.id),
  ]
  saveCamperMessages(campgroundId, next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CAMPER_MSG_EVENT, { detail: { campgroundId } }),
    )
  }
}

export function removeCamperMessage(
  campgroundId: string,
  messageId: string,
): void {
  const existing = loadCamperMessages(campgroundId)
  const next = existing.filter((e) => e.id !== messageId)
  saveCamperMessages(campgroundId, next)
}

export function markCamperMessageSeen(
  campgroundId: string,
  messageId: string,
  lastSeenReplyAt: string,
): void {
  const existing = loadCamperMessages(campgroundId)
  const next = existing.map((e) =>
    e.id === messageId ? { ...e, lastSeenReplyAt } : e,
  )
  saveCamperMessages(campgroundId, next)
}

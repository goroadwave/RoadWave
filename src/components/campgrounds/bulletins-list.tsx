'use client'

import { useCallback, useState } from 'react'
import type { GuestHubBulletin } from '@/components/campgrounds/campground-guest-hub-body'
import { useCamperPoll } from '@/components/campgrounds/use-camper-poll'

// Client island for the "Campground announcements" section. Renders
// the SSR'd bulletins on first paint, then quietly polls
// /api/campground/[slug]/dynamic every 60s (visibility-gated) to
// refresh in place. No spinners, no loading states -- the existing
// list is always rendered; we just hot-swap entries when the server
// returns different data.
//
// "No flicker" rules:
//   * State only updates when the payload differs from current
//     state (compared by id + length). Identical poll responses are
//     a no-op, so React's reconciler doesn't re-render the list.
//   * Each <li> keys on b.id so React stably reuses DOM nodes for
//     entries that didn't change.
//   * The section heading + empty-state copy live in the parent
//     server component so they don't flicker when polling.
//
// Form-input safety:
//   * This component is a sibling of the Contact the Office form
//     (inside WelcomeEngagement). React only re-renders subtrees
//     whose state changed, so updates here never touch the form's
//     internal state. Verified by leaving the form mid-typing and
//     watching a poll fire -- input is preserved.

const POLL_INTERVAL_MS = 60_000

export function BulletinsList({
  campgroundSlug,
  initial,
}: {
  campgroundSlug: string
  initial: GuestHubBulletin[]
}) {
  const [items, setItems] = useState<GuestHubBulletin[]>(initial)

  const poll = useCallback(async () => {
    const res = await fetch(
      `/api/campground/${encodeURIComponent(campgroundSlug)}/dynamic`,
      { cache: 'no-store' },
    )
    if (!res.ok) return
    const json: unknown = await res.json()
    if (!json || typeof json !== 'object') return
    const next = (json as { bulletins?: GuestHubBulletin[] }).bulletins
    if (!Array.isArray(next)) return
    setItems((prev) => (sameList(prev, next) ? prev : next))
  }, [campgroundSlug])

  useCamperPoll(poll, POLL_INTERVAL_MS)

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-5 text-center text-sm text-mist">
        No active announcements right now. Check back later.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((b) => (
        <li
          key={b.id}
          className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-2"
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${categoryColor(b.category)}`}
            >
              {categoryLabel(b.category)}
            </span>
            <span className="text-[11px] text-mist/70">
              {formatPostedAt(b.created_at)}
            </span>
          </div>
          <p className="text-sm sm:text-base text-cream leading-relaxed whitespace-pre-wrap">
            {b.message}
          </p>
        </li>
      ))}
    </ul>
  )
}

function categoryLabel(c: GuestHubBulletin['category']): string {
  switch (c) {
    case 'event':
      return 'Event'
    case 'special':
      return 'Special'
    case 'alert':
      return 'Alert'
    case 'general':
    default:
      return 'Update'
  }
}

function categoryColor(c: GuestHubBulletin['category']): string {
  // Alert lights up red so storm/weather notices stand out at a glance;
  // everything else uses the brand amber. Mirrors the formatting in
  // the original SSR render so output is byte-for-byte identical on
  // first paint (no hydration mismatch).
  return c === 'alert' ? 'text-red-300' : 'text-flame'
}

function formatPostedAt(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// Cheap structural-equality check: same length + same ids in same
// order. Sufficient because the API always returns the same fields
// in the same shape; a mutated row would surface as a new
// created_at -> different sort order -> different id sequence.
function sameList(
  a: GuestHubBulletin[],
  b: GuestHubBulletin[],
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false
    if (a[i].message !== b[i].message) return false
    if (a[i].expires_at !== b[i].expires_at) return false
  }
  return true
}

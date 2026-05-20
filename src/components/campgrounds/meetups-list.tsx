'use client'

import { useCallback, useState } from 'react'
import type { GuestHubMeetup } from '@/components/campgrounds/campground-guest-hub-body'
import { LANTERN_MEETUPS_EVENT } from '@/components/campgrounds/lantern-storage'
import { useCamperPoll } from '@/components/campgrounds/use-camper-poll'

// Client island for the "Upcoming meetups" section. Same shape as
// BulletinsList -- SSR'd initial data, visibility-gated 60s poll
// against /api/campground/[slug]/dynamic, in-place state swap only
// when payload differs. See BulletinsList for the "no flicker" +
// "no form input wipe" rationale; the same rules apply here.

const POLL_INTERVAL_MS = 60_000

export function MeetupsList({
  campgroundSlug,
  campgroundId,
  initial,
}: {
  campgroundSlug: string
  /** See BulletinsList for the same campgroundId-scoping rationale. */
  campgroundId: string
  initial: GuestHubMeetup[]
}) {
  const [items, setItems] = useState<GuestHubMeetup[]>(initial)

  const poll = useCallback(async () => {
    const res = await fetch(
      `/api/campground/${encodeURIComponent(campgroundSlug)}/dynamic`,
      { cache: 'no-store' },
    )
    if (!res.ok) return
    const json: unknown = await res.json()
    if (!json || typeof json !== 'object') return
    const next = (json as { meetups?: GuestHubMeetup[] }).meetups
    if (!Array.isArray(next)) return
    setItems((prev) => {
      if (sameList(prev, next)) return prev
      // Phase 3b -- notify the Lantern. Only fires when payload
      // actually changed (sameList returned false above).
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(LANTERN_MEETUPS_EVENT, {
            detail: {
              campgroundId,
              meetups: next.map((m) => ({
                id: m.id,
                title: m.title,
                start_at: m.start_at,
              })),
            },
          }),
        )
      }
      return next
    })
  }, [campgroundSlug, campgroundId])

  useCamperPoll(poll, POLL_INTERVAL_MS)

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-card/60 p-5 text-center text-sm text-mist">
        No meetups scheduled right now.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((m) => (
        <li
          key={m.id}
          className="rounded-2xl border border-white/5 bg-card p-4 sm:p-5 space-y-2"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
            {formatMeetupTime(m.start_at, m.end_at)}
          </p>
          <h3 className="font-display text-lg font-extrabold text-cream leading-tight">
            {m.title}
          </h3>
          {m.location && (
            <p className="text-sm text-mist">
              <span aria-hidden>📍 </span>
              {m.location}
            </p>
          )}
          {m.description && (
            <p className="text-sm text-cream/90 leading-relaxed whitespace-pre-wrap">
              {m.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

// Meetup time: "Today, 7:00 PM" / "Tomorrow, 8:00 AM" / "Sat Jul 12,
// 6:30 PM" -- with optional end time appended. Mirrors the SSR
// helper formatMeetupTime in campground-guest-hub-body.tsx so the
// first-paint string matches exactly (no hydration mismatch).
function formatMeetupTime(startIso: string, endIso: string | null): string {
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return ''

  const today = new Date()
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  let dayPart: string
  if (isSameDay(start, today)) dayPart = 'Today'
  else if (isSameDay(start, tomorrow)) dayPart = 'Tomorrow'
  else
    dayPart = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  }
  const startTime = start.toLocaleTimeString(undefined, timeOpts)

  if (!endIso) return `${dayPart}, ${startTime}`

  const end = new Date(endIso)
  if (Number.isNaN(end.getTime())) return `${dayPart}, ${startTime}`
  const endTime = end.toLocaleTimeString(undefined, timeOpts)
  return `${dayPart}, ${startTime} – ${endTime}`
}

function sameList(a: GuestHubMeetup[], b: GuestHubMeetup[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false
    if (a[i].title !== b[i].title) return false
    if (a[i].start_at !== b[i].start_at) return false
    if (a[i].end_at !== b[i].end_at) return false
    if (a[i].location !== b[i].location) return false
    if (a[i].description !== b[i].description) return false
  }
  return true
}

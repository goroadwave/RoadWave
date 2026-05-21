'use client'

import { useCallback, useRef, useState } from 'react'
import type {
  GuestHubBulletin,
  GuestHubMeetup,
} from '@/components/campgrounds/campground-guest-hub-body'
import {
  LANTERN_BULLETINS_EVENT,
  LANTERN_CRITICAL_EVENT,
  LANTERN_MEETUPS_EVENT,
} from '@/components/campgrounds/lantern-storage'
import { useCamperPoll } from '@/components/campgrounds/use-camper-poll'

// Phase 4a -- "Happening at <campground name>". Replaces the old
// separate Bulletins + Meetups sections with a single combined
// section. One client island, one poll, both lists rendered
// internally. Same Lantern event dispatches as the old separate
// lists (BulletinsList + MeetupsList) so Phase 3b's Lantern
// behavior is unchanged. The Phase 3c critical-bulletin dispatch
// is preserved too -- it rides on the same /dynamic poll response.
//
// Show / hide rule:
//   * SSR initial: both lists empty -> the entire section returns
//     null (no heading, no empty-state copy, no card frame). When
//     a new bulletin or meetup lands mid-session the next poll
//     un-hides the section in place.
//   * SSR initial: either list has content -> section renders with
//     the "Happening at <name>" heading + both lists. Empty list
//     of either type doesn't render its sub-block.
//
// "No flicker / no form wipe" rules carry over from Phase 3a:
//   * State only updates when the polled payload differs (per-list
//     structural compare). Identical responses are a no-op.
//   * Each <li> keys on the row id so React stably reuses DOM
//     nodes for entries that didn't change.
//   * Polling is visibility-gated via useCamperPoll.
//   * Sibling forms (Contact the Office) aren't in this subtree so
//     poll-driven re-renders never touch their state.

const POLL_INTERVAL_MS = 60_000

type CriticalPayload = {
  id: string
  message: string
  expires_at: string | null
  created_at: string
} | null

export function HappeningSection({
  campgroundSlug,
  campgroundId,
  campgroundName,
  initialBulletins,
  initialMeetups,
}: {
  campgroundSlug: string
  campgroundId: string
  campgroundName: string
  initialBulletins: GuestHubBulletin[]
  initialMeetups: GuestHubMeetup[]
}) {
  const [bulletins, setBulletins] =
    useState<GuestHubBulletin[]>(initialBulletins)
  const [meetups, setMeetups] = useState<GuestHubMeetup[]>(initialMeetups)
  // Track previous critical across polls so we can dispatch the
  // critical event only on actual change. Same logic the old
  // BulletinsList carried -- consolidated here since the
  // /dynamic poll lives in one place now.
  const lastCriticalRef = useRef<CriticalPayload>(null)

  const poll = useCallback(async () => {
    const res = await fetch(
      `/api/campground/${encodeURIComponent(campgroundSlug)}/dynamic`,
      { cache: 'no-store' },
    )
    if (!res.ok) return
    const json: unknown = await res.json()
    if (!json || typeof json !== 'object') return

    const nextBulletins = (json as { bulletins?: GuestHubBulletin[] })
      .bulletins
    const nextMeetups = (json as { meetups?: GuestHubMeetup[] }).meetups
    const critical =
      (json as { critical?: CriticalPayload }).critical ?? null

    // Critical-bulletin change detection. Fires the LANTERN_CRITICAL
    // event when the active critical bulletin appeared, disappeared,
    // or changed id / expires_at. Independent of the bulletin /
    // meetup list compares below.
    const prevCritical = lastCriticalRef.current
    const criticalChanged =
      !!prevCritical !== !!critical ||
      (!!prevCritical &&
        !!critical &&
        (prevCritical.id !== critical.id ||
          prevCritical.expires_at !== critical.expires_at))
    if (criticalChanged) {
      lastCriticalRef.current = critical
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(LANTERN_CRITICAL_EVENT, {
            detail: { campgroundId, critical },
          }),
        )
      }
    }

    if (Array.isArray(nextBulletins)) {
      setBulletins((prev) => {
        if (sameBulletins(prev, nextBulletins)) return prev
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(LANTERN_BULLETINS_EVENT, {
              detail: {
                campgroundId,
                bulletins: nextBulletins.map((b) => ({
                  id: b.id,
                  message: b.message,
                  created_at: b.created_at,
                })),
              },
            }),
          )
        }
        return nextBulletins
      })
    }

    if (Array.isArray(nextMeetups)) {
      setMeetups((prev) => {
        if (sameMeetups(prev, nextMeetups)) return prev
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(LANTERN_MEETUPS_EVENT, {
              detail: {
                campgroundId,
                meetups: nextMeetups.map((m) => ({
                  id: m.id,
                  title: m.title,
                  start_at: m.start_at,
                })),
              },
            }),
          )
        }
        return nextMeetups
      })
    }
  }, [campgroundSlug, campgroundId])

  useCamperPoll(poll, POLL_INTERVAL_MS)

  const hasBulletins = bulletins.length > 0
  const hasMeetups = meetups.length > 0
  if (!hasBulletins && !hasMeetups) return null

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Happening at {campgroundName}
      </h2>

      {hasBulletins && (
        <ul id="bulletins" className="space-y-3 scroll-mt-4">
          {bulletins.map((b) => (
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
      )}

      {hasMeetups && (
        <ul id="meetups" className="space-y-3 scroll-mt-4">
          {meetups.map((m) => (
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
      )}
    </section>
  )
}

// Helpers below mirror the strings + classes the old SSR + island
// renders produced so first-paint output matches exactly (no
// hydration mismatch).

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

function sameBulletins(a: GuestHubBulletin[], b: GuestHubBulletin[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false
    if (a[i].message !== b[i].message) return false
    if (a[i].expires_at !== b[i].expires_at) return false
  }
  return true
}

function sameMeetups(a: GuestHubMeetup[], b: GuestHubMeetup[]): boolean {
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

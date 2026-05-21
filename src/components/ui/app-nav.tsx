'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { enterCampgroundUpdatesOnlyAction } from '@/app/(app)/settings/privacy/actions'

// 8-tab nav matching the demo's GuestApp nav. 4-column grid wraps to
// a second row on phone widths. Renders as a sticky strip directly
// below the layout header.
//
// Tabs 1–7 are navigation links. Tab 8 ("Updates Only") is an action
// button that flips the user into Campground Updates Only privacy mode
// in one tap — matching the demo's 8th-slot action button. It's only
// rendered for guests who are currently checked in to a campground;
// the layout passes `showUpdatesOnly` based on that gate.
//
// Phase 3 of the signed-in hub pivot (2026-05-21) renamed the
// camper-flow tabs:
//   * "Check in" → "Campground". /checkin is now a smart redirect
//     that lands the camper on their active campground hub
//     (/campground/<slug>) when they have a check-in, or a
//     no-context fallback page otherwise. The label reframes the
//     tab around the place, not the action.
//   * "Campers Here" → "Camper Connections". /nearby is also a
//     redirect (to the same hub, which renders the Camper
//     Connections card with the list, wave UI, and visibility
//     pills). Same destination, but the label signals "the social
//     layer" instead of the literal page that used to live here.
//
// Note: an earlier iteration had an 8th "Help" tab here. Riley
// (the floating mascot in the bottom-right corner) is now the single
// entry point for both the in-page tour and the chat panel, so the
// Help tab was removed. The 8th slot is now this CUO shortcut.
const TABS: {
  href: string
  label: string
  matchPrefix?: string
  // Extra paths that should count as a hit for this tab's active
  // highlight. Used so the "Campground" tab lights up while the
  // camper is actually on /campground/<slug> (the destination it
  // redirects to), not just on /checkin during the redirect flash.
  alsoActiveOn?: (string | RegExp)[]
}[] = [
  { href: '/home', label: 'Home' },
  {
    href: '/checkin',
    label: 'Campground',
    alsoActiveOn: [/^\/campground\//],
  },
  { href: '/nearby', label: 'Camper Connections' },
  { href: '/meetups', label: 'Meetups' },
  { href: '/waves', label: 'Waves' },
  { href: '/settings/privacy', label: 'Privacy', matchPrefix: '/settings/privacy' },
  { href: '/crossed-paths', label: 'Past Waves' },
]

type Props = {
  /** Render the 8th "Updates Only" action button. False for guests
   *  without an active check-in. */
  showUpdatesOnly?: boolean
  /** Current privacy mode — used to highlight the Updates Only tab as
   *  active when the user is already in CUO mode. */
  currentPrivacyMode?:
    | 'visible'
    | 'quiet'
    | 'invisible'
    | 'campground_updates_only'
}

export function AppNav({ showUpdatesOnly = false, currentPrivacyMode }: Props) {
  const pathname = usePathname()
  const cuoActive = currentPrivacyMode === 'campground_updates_only'

  return (
    <nav className="border-b border-white/5 bg-night/60 backdrop-blur sticky top-[56px] z-10">
      <div className="mx-auto max-w-3xl px-3 py-2">
        <ul className="grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
          {TABS.map((t) => {
            const active = isActive(pathname, t)
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={
                    active
                      ? 'block text-center rounded-md bg-flame/15 text-flame px-2 py-1.5 font-semibold'
                      : 'block text-center rounded-md text-mist px-2 py-1.5 hover:text-cream hover:bg-white/5 transition-colors'
                  }
                  aria-current={active ? 'page' : undefined}
                >
                  {t.label}
                </Link>
              </li>
            )
          })}
          {showUpdatesOnly && (
            <li>
              <form action={enterCampgroundUpdatesOnlyAction}>
                <button
                  type="submit"
                  className={
                    cuoActive
                      ? 'block w-full text-center rounded-md bg-flame/15 text-flame px-2 py-1.5 font-semibold'
                      : 'block w-full text-center rounded-md text-mist px-2 py-1.5 hover:text-cream hover:bg-white/5 transition-colors'
                  }
                  aria-current={cuoActive ? 'page' : undefined}
                >
                  Updates Only
                </button>
              </form>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}

function isActive(
  pathname: string | null,
  tab: {
    href: string
    matchPrefix?: string
    alsoActiveOn?: (string | RegExp)[]
  },
): boolean {
  if (!pathname) return false
  if (tab.matchPrefix && pathname.startsWith(tab.matchPrefix)) return true
  if (pathname === tab.href) return true
  if (tab.alsoActiveOn) {
    for (const m of tab.alsoActiveOn) {
      if (typeof m === 'string' ? pathname === m : m.test(pathname)) return true
    }
  }
  return false
}

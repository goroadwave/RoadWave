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
// Note: an earlier iteration had an 8th "Help" tab here. Riley
// (the floating mascot in the bottom-right corner) is now the single
// entry point for both the in-page tour and the chat panel, so the
// Help tab was removed. The 8th slot is now this CUO shortcut.
const TABS: { href: string; label: string; matchPrefix?: string }[] = [
  { href: '/home', label: 'Home' },
  { href: '/checkin', label: 'Check in' },
  { href: '/nearby', label: 'Campers Here' },
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
  tab: { href: string; matchPrefix?: string },
): boolean {
  if (!pathname) return false
  if (tab.matchPrefix) return pathname.startsWith(tab.matchPrefix)
  return pathname === tab.href
}

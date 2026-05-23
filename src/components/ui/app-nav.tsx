'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 7-tab nav matching the demo's GuestApp nav. 4-column grid wraps to
// a second row on phone widths. Renders as a sticky strip directly
// below the layout header.
//
// History: this strip briefly had an 8th "Updates Only" action button
// that flipped the user into campground_updates_only privacy mode in
// one tap. Removed 2026-05-23 -- checked-in campers see bulletins +
// meetups naturally inside the campground experience and Lantern, so
// the shortcut wasn't pulling its weight. Updates-Only is still
// reachable from /settings/privacy (the Privacy tab) for campers
// who explicitly want it.
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
  /** When true (default), the nav is sticky-positioned under the
   *  (app) layout's 56px header. When false, render inline -- used
   *  by the signed-in campground hub at /campground/[slug] which
   *  lives outside the (app) group and has its own non-sticky
   *  header. Without this opt-out the nav would float at top:56px
   *  in empty space on the hub. */
  sticky?: boolean
}

export function AppNav({ sticky = true }: Props) {
  const pathname = usePathname()

  return (
    <nav
      className={
        sticky
          ? 'border-b border-white/5 bg-night/60 backdrop-blur sticky top-[56px] z-10'
          : 'rounded-2xl border border-white/10 bg-night/60 backdrop-blur'
      }
    >
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

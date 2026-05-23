'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type NavBadgeCounts } from '@/lib/notifications/nav-badges'
import { useNavBadges } from '@/components/ui/use-nav-badges'

// 8-tab nav matching the demo's GuestApp nav. 4-column grid wraps to
// a clean 4x2 on phone widths. Renders as a sticky strip directly
// below the layout header.
//
// Label evolution (2026-05-23):
//   * "Privacy" -> "Profile". The /profile route is an account index
//     that surfaces the editable profile fields (display name, rig
//     type, interests via /profile/setup) AND the visibility/privacy
//     controls (via /settings/privacy), so the label change is a
//     copy fix, not a destination move.
//   * Added "Bulletins" -- focused view of campground bulletins.
//
// Per-category badge model (2026-05-23):
//   Each tab can carry an unread count from the public.notifications
//   table (populated by the mig 0025 triggers on waves / matches /
//   messages / bulletins / meetups). The badge shows the count and
//   adds .lantern-pulse so the tab glows. The pulse animation is
//   suppressed under prefers-reduced-motion (rule lives in
//   src/app/globals.css alongside the original Lantern pulse).
//
//   Read/dismiss: visiting a page does NOT auto-mark notifications
//   read. The badge stays until the camper explicitly clicks the
//   notification in the Lantern (or Mark All as Read). Toast dismiss
//   does NOT touch the notification record either.
type TabCategory = keyof NavBadgeCounts | null

const TABS: {
  href: string
  label: string
  matchPrefix?: string
  // Extra paths that should count as a hit for this tab's active
  // highlight. Used so the "Campground" tab lights up while the
  // camper is actually on /campground/<slug> (the destination it
  // redirects to), not just on /checkin during the redirect flash.
  alsoActiveOn?: (string | RegExp)[]
  // Which NavBadgeCounts key (if any) drives the badge on this tab.
  // null means no badge ever appears for the tab (e.g. Home, Profile).
  category: TabCategory
}[] = [
  { href: '/home', label: 'Home', category: null },
  {
    href: '/checkin',
    label: 'Campground',
    alsoActiveOn: [/^\/campground\//],
    category: null,
  },
  { href: '/nearby', label: 'Camper Connections', category: null },
  { href: '/meetups', label: 'Meetups', category: 'meetups' },
  { href: '/waves', label: 'Waves', category: 'waves' },
  {
    href: '/profile',
    label: 'Profile',
    // Light up "Profile" while the camper is on any /profile/* sub-route
    // (e.g. /profile/setup) AND on /settings/privacy (the privacy
    // picker is conceptually "profile -> privacy").
    matchPrefix: '/profile',
    alsoActiveOn: [/^\/settings\/privacy/],
    category: null,
  },
  { href: '/crossed-paths', label: 'Past Waves', category: 'pastWaves' },
  { href: '/bulletins', label: 'Bulletins', category: 'bulletins' },
]

type Props = {
  /** When true (default), the nav is sticky-positioned under the
   *  (app) layout's 56px header. When false, render inline -- used
   *  by the signed-in campground hub at /campground/[slug] which
   *  lives outside the (app) group and has its own non-sticky
   *  header. Without this opt-out the nav would float at top:56px
   *  in empty space on the hub. */
  sticky?: boolean
  /** Initial per-category unread counts for first-paint badges.
   *  Computed server-side by loadNavBadgeCounts in the (app) layout
   *  (or hub) and seeded into the hook here. The hook polls every
   *  60s thereafter to keep the badges fresh. When omitted (e.g.
   *  the campground hub before the SSR fetch is wired), the hook
   *  starts with zero counts and fills in on its first poll. */
  initialBadgeCounts?: NavBadgeCounts
}

export function AppNav({ sticky = true, initialBadgeCounts }: Props) {
  const pathname = usePathname()
  const badges = useNavBadges(
    initialBadgeCounts ?? {
      bulletins: 0,
      meetups: 0,
      waves: 0,
      pastWaves: 0,
    },
  )

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
            const count = t.category ? badges[t.category] : 0
            const hasUnread = count > 0
            const baseCls = active
              ? 'block text-center rounded-md bg-flame/15 text-flame px-2 py-1.5 font-semibold'
              : 'block text-center rounded-md text-mist px-2 py-1.5 hover:text-cream hover:bg-white/5 transition-colors'
            // Reuse the existing lantern-pulse keyframe (defined in
            // globals.css) for unread tabs. Pulse is suppressed
            // automatically under prefers-reduced-motion.
            const cls = hasUnread ? `${baseCls} lantern-pulse` : baseCls
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cls}
                  aria-current={active ? 'page' : undefined}
                  aria-label={
                    hasUnread
                      ? `${t.label} -- ${count} unread`
                      : undefined
                  }
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    {t.label}
                    {hasUnread && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-flame px-1 text-[10px] font-bold tabular-nums leading-none text-night">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </span>
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

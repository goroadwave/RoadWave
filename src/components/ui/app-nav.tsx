'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 5-tab signed-in nav. IA refactor (Camper Connections v6, 2026-05-22)
// reduced this from 8 items (Home, Campground, Camper Connections,
// Meetups, Waves, Privacy, Past Waves, Updates Only) to the 5
// surfaces a camper actually navigates between mid-session. The
// dropped four moved to dashboard cards on /home:
//
//   * Meetups       -> dashboard card (still on /meetups)
//   * Privacy       -> dashboard card (still on /settings/privacy)
//   * Updates Only  -> dashboard card (toggle action)
//   * Profile       -> dashboard card via /profile link
//
// The remaining five are the "I'm probably going here next" set:
//
//   1. Home         -> /home (My RoadWave dashboard)
//   2. Campground   -> /checkin (smart redirect to /campground/<slug>
//                                or the no-context fallback)
//   3. Camper Conn. -> /nearby (focused page now; NOT an anchor on
//                                a long mixed page)
//   4. Waves        -> /waves (Incoming + Sent sections)
//   5. Past Waves   -> /crossed-paths (Road Memory archive)
//
// Single row, compact, no anchor jumps. The "Campers Here" CTA on
// the QR page links to /nearby directly so a returning camper
// doesn't need to find the tab.
const TABS: {
  href: string
  label: string
  matchPrefix?: string
  alsoActiveOn?: (string | RegExp)[]
}[] = [
  { href: '/home', label: 'Home' },
  {
    href: '/checkin',
    label: 'Campground',
    alsoActiveOn: [/^\/campground\//],
  },
  { href: '/nearby', label: 'Camper Connections' },
  { href: '/waves', label: 'Waves' },
  { href: '/crossed-paths', label: 'Past Waves' },
]

type Props = {
  /** Kept for backwards-compat with existing callers; the dashboard
   *  card on /home now owns the Updates Only toggle so this prop
   *  has no visual effect here anymore. */
  showUpdatesOnly?: boolean
  /** Kept for backwards-compat; the dashboard card on /home shows
   *  the current privacy mode. */
  currentPrivacyMode?:
    | 'visible'
    | 'quiet'
    | 'invisible'
    | 'campground_updates_only'
  /** When true (default), the nav sticks under the (app) layout's
   *  56px header. */
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
      aria-label="Primary"
    >
      <div className="mx-auto max-w-3xl px-2 py-1.5">
        <ul className="flex items-center gap-1 overflow-x-auto text-[11px] sm:text-xs">
          {TABS.map((t) => {
            const active = isActive(pathname, t)
            return (
              <li key={t.href} className="shrink-0">
                <Link
                  href={t.href}
                  className={
                    active
                      ? 'inline-block text-center rounded-md bg-flame/15 text-flame px-2.5 py-1.5 font-semibold whitespace-nowrap'
                      : 'inline-block text-center rounded-md text-mist px-2.5 py-1.5 hover:text-cream hover:bg-white/5 transition-colors whitespace-nowrap'
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

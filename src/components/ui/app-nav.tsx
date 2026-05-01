'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 7-tab nav matching the demo's GuestApp nav. 4-column grid wraps to a
// second row of 3 on phone widths. Renders as a sticky strip directly
// below the layout header.
const TABS: { href: string; label: string; matchPrefix?: string }[] = [
  { href: '/home', label: 'Home' },
  { href: '/checkin', label: 'Check in' },
  { href: '/nearby', label: 'Campers Here' },
  { href: '/meetups', label: 'Meetups' },
  { href: '/waves', label: 'Waves' },
  { href: '/settings/privacy', label: 'Privacy', matchPrefix: '/settings/privacy' },
  { href: '/crossed-paths', label: 'Crossed' },
]

export function AppNav() {
  const pathname = usePathname()

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

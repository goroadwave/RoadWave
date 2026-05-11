'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useGuestSupport } from '@/components/support/guest-support-context'

// 7-tab nav matching the demo's GuestApp nav, plus an 8th "Help" tab
// that's only rendered when the guest support chat is enabled (i.e.,
// the visitor has an active check-in). 4-column grid wraps to a
// second row on phone widths. Renders as a sticky strip directly
// below the layout header.
const TABS: { href: string; label: string; matchPrefix?: string }[] = [
  { href: '/home', label: 'Home' },
  { href: '/checkin', label: 'Check in' },
  { href: '/nearby', label: 'Campers Here' },
  { href: '/meetups', label: 'Meetups' },
  { href: '/waves', label: 'Waves' },
  { href: '/settings/privacy', label: 'Privacy', matchPrefix: '/settings/privacy' },
  { href: '/crossed-paths', label: 'Past Waves' },
]

export function AppNav() {
  const pathname = usePathname()
  // useGuestSupport returns the inert defaults when called outside the
  // provider (e.g. should this nav ever render on a non-(app) surface),
  // so no need to special-case mounting context.
  const { enabled: helpEnabled, open: helpOpen, setOpen: setHelpOpen } =
    useGuestSupport()

  return (
    <nav className="border-b border-white/5 bg-night/60 backdrop-blur sticky top-[56px] z-10">
      <div className="mx-auto max-w-3xl px-3 py-2">
        <ul className="grid grid-cols-4 gap-1 text-[11px] sm:text-xs">
          {TABS.flatMap((t) => {
            const active = isActive(pathname, t)
            const tabItem = (
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
            // Insert the "Help" tab immediately after Meetups per
            // spec — only when the chat is actually available.
            if (t.href === '/meetups' && helpEnabled) {
              return [
                tabItem,
                <li key="__help">
                  <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={helpOpen}
                    className={
                      helpOpen
                        ? 'w-full block text-center rounded-md bg-flame/15 text-flame px-2 py-1.5 font-semibold'
                        : 'w-full block text-center rounded-md text-mist px-2 py-1.5 hover:text-cream hover:bg-white/5 transition-colors'
                    }
                  >
                    Help
                  </button>
                </li>,
              ]
            }
            return [tabItem]
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

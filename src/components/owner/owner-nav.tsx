'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS: { href: string; label: string }[] = [
  { href: '/owner/dashboard', label: 'Home' },
  { href: '/owner/profile', label: 'Profile' },
  { href: '/owner/qr', label: 'QR' },
  { href: '/owner/bulletin', label: 'Bulletin' },
  { href: '/owner/meetups', label: 'Meetups' },
  { href: '/owner/analytics', label: 'Stats' },
  { href: '/owner/billing', label: 'Billing' },
]

export function OwnerNav() {
  const pathname = usePathname()
  return (
    <nav className="border-b border-white/5 bg-night/60 backdrop-blur sticky top-[56px] z-10">
      <div className="mx-auto max-w-3xl px-3 py-2">
        <ul className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-[11px] sm:text-xs">
          {TABS.map((t) => {
            const active = pathname === t.href
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

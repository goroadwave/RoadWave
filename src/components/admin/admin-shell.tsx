'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

const TABS = [
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/inbox', label: 'Inbox' },
  { href: '/admin/safety', label: 'Safety' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/health', label: 'Health' },
  { href: '/admin/campgrounds', label: 'Campgrounds' },
] as const

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen bg-night text-cream">
      <header className="border-b border-white/5 bg-card/40 px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          <Link href="/admin" className="font-display text-lg font-extrabold text-cream">
            RoadWave <span className="text-flame">Admin</span>
          </Link>
          <Link
            href="/home"
            className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            ← Back to app
          </Link>
        </div>
      </header>

      <nav className="border-b border-white/5 bg-card/20 px-4 py-2 overflow-x-auto">
        <ul className="mx-auto max-w-6xl flex gap-1 text-xs">
          {TABS.map((t) => {
            const active = pathname === t.href
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={
                    active
                      ? 'inline-block rounded-md bg-flame/15 text-flame px-3 py-1.5 font-semibold'
                      : 'inline-block rounded-md text-mist px-3 py-1.5 hover:text-cream hover:bg-white/5'
                  }
                >
                  {t.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

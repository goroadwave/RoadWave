'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/logo'

const PRODUCT_LINKS: { label: string; href: string }[] = [
  { label: 'Demo', href: '/demo' },
  { label: 'How it works', href: '/tour' },
  { label: 'For campgrounds', href: '/campgrounds' },
]

const COMPANY_LINKS: { label: string; href: string }[] = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
]

export function SiteFooter() {
  // Footer is guest- and marketing-facing only. Owner dashboard pages
  // (everything under /owner) get no footer — they have their own chrome
  // and the marketing links don't belong there.
  const pathname = usePathname()
  if (pathname?.startsWith('/owner')) return null

  return (
    <footer className="mt-20 border-t border-white/10 bg-night text-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <Logo className="text-2xl" />
            <p className="text-xs text-mist leading-snug max-w-[18rem]">
              Privacy-first campground connections for RVers. Wave when the
              vibe&apos;s right.
            </p>
          </div>

          <Column title="Product" links={PRODUCT_LINKS} />
          <Column title="Company" links={COMPANY_LINKS} />
          <Column title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-xs text-mist/70 text-center">
            © {new Date().getUTCFullYear()} RoadWave. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

function Column({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm text-cream/90 hover:text-flame transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

// Single shared footer for guest, marketing, AND owner-facing pages. The
// previous split (SiteFooter + OwnerFooter) is gone — every page reaches
// the same four columns now.

const GUEST_LINKS: { label: string; href: string }[] = [
  { label: 'Safety', href: '/safety' },
  { label: 'Community Rules', href: '/community-rules' },
  { label: 'Account Deletion', href: '/safety' },
]

const OWNER_LINKS: { label: string; href: string }[] = [
  { label: 'Campground Safety Overview', href: '/campground-safety' },
  { label: 'Partner Terms', href: '/campground-partner-terms' },
  { label: 'Get a Demo', href: '/owners' },
]

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Safety Protocol', href: '/safety-protocol' },
  { label: 'Law Enforcement Policy', href: '/law-enforcement' },
  { label: 'Data Breach Policy', href: '/data-breach-policy' },
]

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-night text-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <Logo className="text-2xl" />
            <p className="text-xs text-mist leading-snug max-w-[18rem]">
              Privacy-first campground connections for RVers. Wave when the
              vibe&apos;s right.
            </p>
          </div>

          <Column title="Guests" links={GUEST_LINKS} />
          <Column title="Campground Owners" links={OWNER_LINKS} />
          <Column title="Legal" links={LEGAL_LINKS} />
          <ContactColumn />
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

function ContactColumn() {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
        Contact
      </p>
      <ul className="space-y-2">
        <li>
          <a
            href="mailto:hello@getroadwave.com"
            className="text-sm text-cream/90 hover:text-flame transition-colors break-all"
          >
            hello@getroadwave.com
          </a>
        </li>
        <li>
          <a
            href="mailto:safety@getroadwave.com"
            className="text-sm text-cream/90 hover:text-flame transition-colors break-all"
          >
            safety@getroadwave.com
          </a>
        </li>
        <li>
          <Link
            href="/contact"
            className="text-sm text-cream/90 hover:text-flame transition-colors"
          >
            getroadwave.com/contact
          </Link>
        </li>
      </ul>
    </div>
  )
}

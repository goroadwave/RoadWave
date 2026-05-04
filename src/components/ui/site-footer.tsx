import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { OwnerInfoModal } from '@/components/ui/owner-info-modal'

// Single shared footer for guest, marketing, AND owner-facing pages.
//
// Five-column layout on >=sm: logo + tagline, Guests, Campground
// Owners (modal trigger + supporting links), Legal, Contact.
// Two-column on phone (logo + tagline span the full row, then the
// four link columns wrap into 2x2).
//
// Campground Owners column is consolidated around the OwnerInfoModal
// trigger. The trigger replaces the column header, so the headline
// itself opens the owner pitch + Start CTA. The supporting list
// underneath keeps direct URLs to assets that aren't part of the
// modal pitch (Partner Terms, Safety Overview, Contact).

const GUEST_LINKS: { label: string; href: string }[] = [
  { label: 'See a sample campground page', href: '/demo' },
  { label: 'Safety', href: '/safety' },
  { label: 'Community Rules', href: '/community-rules' },
  { label: 'Account Deletion', href: '/account-deletion' },
]

const OWNER_SUB_LINKS: { label: string; href: string }[] = [
  { label: 'Partner Terms', href: '/campground-partner-terms' },
  { label: 'Safety Overview', href: '/campground-safety' },
  { label: 'Contact', href: '/contact' },
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
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6 sm:pt-14 sm:pb-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <Logo className="text-2xl" />
            <p className="text-xs text-mist leading-snug max-w-[18rem]">
              A private way to see campground updates, find shared
              interests, and say hello only when you want to.
            </p>
          </div>

          <Column title="Guests" links={GUEST_LINKS} />
          <OwnerColumn />
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

function OwnerColumn() {
  return (
    <div className="space-y-3">
      <OwnerInfoModal variant="footer-link" />
      <ul className="space-y-2">
        {OWNER_SUB_LINKS.map((l) => (
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

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

// Single shared footer for guest, marketing, AND owner-facing pages.
//
// Desktop / tablet (>=sm): full multi-column layout — logo + tagline,
// then the Guests, Campground Owners, Legal, and Contact link columns.
//
// Mobile (<sm): the same groups collapse into compact accordion sections
// (native <details>, so no client JS). Only the group titles show by
// default; tapping a group reveals its links. This keeps every legal and
// contact link reachable without the tall, fully-expanded footer that
// made phones scroll through a long block after the page content.

type FooterLinkItem = { label: string; href: string }

const GUEST_LINKS: FooterLinkItem[] = [
  { label: 'See a sample campground page', href: '/demo' },
  { label: 'Safety', href: '/safety' },
  { label: 'Community Rules', href: '/community-rules' },
  { label: 'Account Deletion', href: '/account-deletion' },
]

const OWNER_LINKS: FooterLinkItem[] = [
  // For Campgrounds → the explanation page (/owners).
  // Start a Campground Pilot → the short action-focused intake
  // form (/owners/start). These two are intentionally separate
  // destinations so the footer flow doesn't loop back to the same
  // marketing copy.
  { label: 'For Campgrounds', href: '/owners' },
  { label: 'Start a Campground Pilot', href: '/owners/start' },
  { label: 'Campground Safety Overview', href: '/campground-safety' },
  { label: 'Campground Partner Terms', href: '/campground-partner-terms' },
  { label: 'Contact RoadWave', href: '/contact' },
]

const LEGAL_LINKS: FooterLinkItem[] = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Safety Protocol', href: '/safety-protocol' },
  { label: 'Law Enforcement Policy', href: '/law-enforcement' },
  { label: 'Data Breach Policy', href: '/data-breach-policy' },
]

const CONTACT_LINKS: FooterLinkItem[] = [
  { label: 'hello@getroadwave.com', href: 'mailto:hello@getroadwave.com' },
  { label: 'safety@getroadwave.com', href: 'mailto:safety@getroadwave.com' },
  { label: 'getroadwave.com/contact', href: '/contact' },
]

// Drives the mobile accordion. Mirrors the desktop columns 1:1 so every
// link stays reachable on both layouts.
const FOOTER_GROUPS: { title: string; links: FooterLinkItem[] }[] = [
  { title: 'Guests', links: GUEST_LINKS },
  { title: 'Campground Owners', links: OWNER_LINKS },
  { title: 'Legal', links: LEGAL_LINKS },
  { title: 'Contact', links: CONTACT_LINKS },
]

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-white/10 bg-night text-cream">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:pt-12 sm:pb-8">
        {/* Desktop / tablet: multi-column links */}
        <div className="hidden gap-x-8 gap-y-7 sm:grid sm:grid-cols-5">
          <div className="space-y-3">
            <Logo className="text-2xl" />
            <p className="text-xs text-mist leading-snug max-w-[18rem]">
              A private way to see campground updates, find shared
              interests, and say hello only when you want to.
            </p>
          </div>
          <Column title="Guests" links={GUEST_LINKS} />
          <Column title="Campground Owners" links={OWNER_LINKS} />
          <Column title="Legal" links={LEGAL_LINKS} />
          <Column title="Contact" links={CONTACT_LINKS} />
        </div>

        {/* Mobile: collapsible accordion groups (titles only by default) */}
        <div className="sm:hidden">
          <Logo className="text-xl" />
          <div className="mt-5 border-t border-white/10">
            {FOOTER_GROUPS.map((g) => (
              <details
                key={g.title}
                className="group border-b border-white/10"
              >
                <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-flame">
                    {g.title}
                  </span>
                  <span
                    aria-hidden
                    className="text-mist transition-transform duration-200 group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <ul className="space-y-2.5 pb-4">
                  {g.links.map((l) => (
                    <li key={l.label}>
                      <FooterLink {...l} />
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-mist/70 text-center">
            © {new Date().getUTCFullYear()} RoadWave USA LLC. All rights reserved.
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
  links: FooterLinkItem[]
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <FooterLink {...l} />
          </li>
        ))}
      </ul>
    </div>
  )
}

// Renders an internal route as <Link> and a mailto/external target as a
// plain <a>. break-words keeps long emails / URLs from forcing horizontal
// overflow in narrow columns.
function FooterLink({ label, href }: FooterLinkItem) {
  const cls =
    'text-sm text-cream/90 hover:text-flame transition-colors break-words'
  if (href.startsWith('mailto:') || href.startsWith('http')) {
    return (
      <a href={href} className={cls}>
        {label}
      </a>
    )
  }
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  )
}

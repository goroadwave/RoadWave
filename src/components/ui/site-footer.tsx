import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

type IconProps = React.SVGProps<SVGSVGElement>

function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.86.31-1.5 1.5-1.5h1.5V4.2A20 20 0 0 0 14.6 4C12.34 4 10.8 5.4 10.8 7.9v2.6H8.5v3h2.3V21h2.7Z" />
    </svg>
  )
}

function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26.4 26.4 0 0 0 2 12a26.4 26.4 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26.4 26.4 0 0 0 22 12a26.4 26.4 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  )
}

const PRODUCT_LINKS: { label: string; href: string }[] = [
  { label: 'Demo', href: '/demo' },
  { label: 'How it works', href: '/tour' },
  { label: 'For campgrounds', href: '/campgrounds' },
]

const COMPANY_LINKS: { label: string; href: string }[] = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: 'mailto:markhalesmith@gmail.com' },
]

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
]

const SOCIAL_LINKS: {
  label: string
  href: string
  Icon: (props: IconProps) => React.ReactElement
}[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/getroadwave', Icon: InstagramIcon },
  { label: 'Facebook', href: 'https://www.facebook.com/getroadwave', Icon: FacebookIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/@getroadwave', Icon: YoutubeIcon },
]

export function SiteFooter() {
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

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-mist/70 text-center sm:text-left">
            © {new Date().getUTCFullYear()} RoadWave. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
              Connect
            </span>
            <ul className="flex items-center gap-2">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-mist hover:text-flame hover:border-flame/40 transition-colors"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
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

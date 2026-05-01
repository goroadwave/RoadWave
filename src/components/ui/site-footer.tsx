import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

// Single shared footer for guest, marketing, AND owner-facing pages.
//
// The "Campground Owners" column is now a single expandable
// (OwnerExpandable) — collapsed by default, opens to reveal the full
// owner pitch + sections + Get Started CTA, all driven by native
// <details>/<summary>. The previous Campground Safety / Partner Terms /
// Start My Campground Pilot links live inside the expandable body now.

const GUEST_LINKS: { label: string; href: string }[] = [
  { label: 'Safety', href: '/safety' },
  { label: 'Community Rules', href: '/community-rules' },
  { label: 'Account Deletion', href: '/safety' },
]

const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Safety Protocol', href: '/safety-protocol' },
  { label: 'Law Enforcement Policy', href: '/law-enforcement' },
  { label: 'Data Breach Policy', href: '/data-breach-policy' },
]

const OWNER_PITCH_BULLETS: string[] = [
  'Branded campground guest page',
  'Campground bulletins and meetup prompts',
  'Campground Updates Only for private guests',
  'Privacy-safe owner dashboard with engagement stats',
]

const OWNER_HOW_FOR_YOU: { title: string; body: string }[] = [
  {
    title: '1. Your branded guest page',
    body: 'Guests scan your QR code and land on a page connected to your campground — your branding, your bulletins, your meetups.',
  },
  {
    title: '2. Your QR code',
    body: 'Print and place at check-in, the office window, the bulletin board, or the bath houses. No app download required for guests.',
  },
  {
    title: '3. Your front-desk script',
    body: 'One sentence at check-in: “Scan the QR at the office to see what’s happening this weekend.”',
  },
  {
    title: '4. Your admin dashboard',
    body: 'Post bulletins, meetup prompts, and see privacy-safe engagement stats — without seeing private guest details.',
  },
]

const OWNER_HOW_FOR_GUESTS: { title: string; body: string }[] = [
  {
    title: '1. Guest scans the QR code',
    body: 'Lands on your branded guest page instantly. No download, no account required just to look around.',
  },
  {
    title: '2. Guest checks in',
    body: 'Picks travel style and interests. Check-in expires automatically after 24 hours.',
  },
  {
    title: '3. Guest chooses a privacy mode',
    body: 'Visible, Quiet, Invisible, or Campground Updates Only. They can switch any time, in one tap.',
  },
  {
    title: '4. Guest sees your bulletins and meetup prompts',
    body: 'One easy place for everything happening at your campground today.',
  },
  {
    title: '5. Guest browses campers who share their interests (optional)',
    body: 'No exact site numbers shown. Browsing is opt-in via Visible or Quiet mode.',
  },
  {
    title: '6. Optional wave',
    body: 'A private hello only opens when both people wave. No public group chat, no comment threads.',
  },
]

const OWNER_PRIVACY_SAFETY: { title: string; body: string }[] = [
  {
    title: 'No exact site numbers',
    body: 'Site numbers are never displayed in the app. Guests can share their site 1:1 via private hello after a mutual wave — never publicly.',
  },
  {
    title: 'No public group chat',
    body: "Guests can't post to a public feed. Bulletins go from you to all checked-in guests; private hellos only open after both sides wave.",
  },
  {
    title: '18+ required',
    body: "Guests confirm they're 18 or older during signup. Underage accounts are removed.",
  },
  {
    title: 'Campground Updates Only for private guests',
    body: "Guests who want only your bulletins and meetups can pick Campground Updates Only — they're invisible to other campers and can't send or receive waves.",
  },
  {
    title: 'You are not responsible for guest-to-guest interactions after a mutual wave',
    body: "Once two guests have mutually waved and a private hello is open, that conversation is between them. Your campground isn't the host of the conversation.",
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-night text-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <Logo className="text-2xl" />
            <p className="text-xs text-mist leading-snug max-w-[18rem]">
              A private way to see campground updates, find shared
              interests, and say hello only when you want to.
            </p>
          </div>

          <Column title="Guests" links={GUEST_LINKS} />
          <OwnerExpandable />
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

// Native <details>-driven expandable. Collapsed state is just the
// column header "Campground Owners +"; opens to reveal the full
// owner pitch + sections (B/C/D/E) + Get Started CTA.
function OwnerExpandable() {
  return (
    <details className="group/owner">
      <summary className="list-none cursor-pointer flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-flame hover:text-amber-300 transition-colors [&::-webkit-details-marker]:hidden">
        <span>Campground Owners</span>
        <span
          className="text-flame text-base font-bold leading-none transition-transform group-open/owner:rotate-45"
          aria-hidden
        >
          +
        </span>
      </summary>

      <div className="mt-4 space-y-6 rounded-xl border border-flame/30 bg-card/40 p-4">
        {/* A. Pitch */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
            For campground owners
          </p>
          <h3 className="font-display text-lg font-extrabold text-cream leading-tight">
            A branded campground guest page powered by your QR code.
          </h3>
          <ul className="space-y-1.5">
            {OWNER_PITCH_BULLETS.map((b) => (
              <li
                key={b}
                className="text-xs text-cream/90 flex items-start gap-2"
              >
                <span className="text-flame mt-0.5" aria-hidden>
                  ✓
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-flame/30 bg-flame/[0.06] p-3 space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
                Founding rate
              </p>
              <p className="text-cream font-semibold">
                $39<span className="text-mist text-xs font-medium">/month</span>
              </p>
            </div>
            <Link
              href="/start"
              className="block w-full text-center rounded-lg bg-flame text-night px-3 py-2 text-xs font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors"
            >
              Get Started →
            </Link>
          </div>
        </div>

        {/* B. How It Works for You */}
        <FooterOwnerSection title="How it works for you" items={OWNER_HOW_FOR_YOU} />

        {/* C. How It Works for Your Guests */}
        <FooterOwnerSection title="How it works for your guests" items={OWNER_HOW_FOR_GUESTS} />

        {/* D. What You Can and Cannot See */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
            What you can and cannot see
          </p>
          <details className="group/inner rounded-lg border border-flame/30 bg-card overflow-hidden">
            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
              <span className="text-xs font-semibold text-cream">
                What you can see
              </span>
              <span
                className="text-flame text-base font-bold leading-none transition-transform group-open/inner:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <ul className="px-3 pb-3 text-xs text-mist list-disc list-inside space-y-1">
              <li>QR code scans</li>
              <li>Guest check-ins</li>
              <li>Bulletin views</li>
              <li>Meetup interest</li>
              <li>Popular guest interests</li>
            </ul>
          </details>
          <details className="group/inner rounded-lg border border-white/10 bg-card overflow-hidden">
            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
              <span className="text-xs font-semibold text-cream">
                What you cannot see
              </span>
              <span
                className="text-flame text-base font-bold leading-none transition-transform group-open/inner:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <ul className="px-3 pb-3 text-xs text-mist list-disc list-inside space-y-1">
              <li>Private messages</li>
              <li>Exact site numbers</li>
              <li>Who waved at whom</li>
              <li>Guest-to-guest conversations</li>
              <li>Exact guest locations</li>
            </ul>
          </details>
        </div>

        {/* E. Privacy and Safety */}
        <FooterOwnerSection title="Privacy and safety" items={OWNER_PRIVACY_SAFETY} />
      </div>
    </details>
  )
}

function FooterOwnerSection({
  title,
  items,
}: {
  title: string
  items: { title: string; body: string }[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
        {title}
      </p>
      <div className="space-y-1.5">
        {items.map((s) => (
          <details
            key={s.title}
            className="group/inner rounded-lg border border-white/10 bg-card overflow-hidden"
          >
            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
              <span className="text-xs font-semibold text-cream">
                {s.title}
              </span>
              <span
                className="text-flame text-base font-bold leading-none transition-transform group-open/inner:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="px-3 pb-3 text-xs text-mist leading-relaxed">
              {s.body}
            </p>
          </details>
        ))}
      </div>
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

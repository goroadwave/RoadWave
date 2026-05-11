// Context-aware secondary CTA shown inside the Riley popup. Camper-facing
// pages get "Try the Demo" (amber demo-style button); owner-facing pages
// get "Start My Campground Pilot" (filled green primary). The `kind`
// field lets the renderer pick the matching button style — green for
// start/signup actions, amber/secondary for demo/preview actions.

export type RileyPopupCta = {
  label: string
  href: string
  kind: 'start' | 'demo'
}

// Owner-facing path prefixes. /campgrounds and /start are still here
// as legacy redirects; matching them keeps the popup CTA consistent
// during the brief moment a visitor is on the redirect destination.
const OWNER_PREFIXES = ['/owners', '/campgrounds'] as const

export function rileyPopupCtaForPath(pathname: string | null): RileyPopupCta {
  if (
    pathname &&
    OWNER_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
  ) {
    return {
      label: 'Start My Campground Pilot',
      href: '/owners/start',
      kind: 'start',
    }
  }
  return { label: 'Try the Demo', href: '/demo', kind: 'demo' }
}

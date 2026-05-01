// Context-aware secondary CTA shown inside the Riley popup. Camper-facing
// pages get "Try the Demo"; owner-facing pages get "Start My Campground
// Pilot". Falls through to the camper CTA when the path isn't matched.

export type RileyPopupCta = { label: string; href: string }

const OWNER_PREFIXES = ['/owners', '/campgrounds', '/start'] as const

export function rileyPopupCtaForPath(pathname: string | null): RileyPopupCta {
  if (
    pathname &&
    OWNER_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
  ) {
    return { label: 'Start My Campground Pilot', href: '/start' }
  }
  return { label: 'Try the Demo', href: '/demo' }
}

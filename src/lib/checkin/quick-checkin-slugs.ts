// Allow-list of campground slugs that support the /quickcheckin
// flow — a no-signup check-in path used for demo and end-to-end
// owner testing.
//
// Behaviour for slugs in this list:
//   * The "Check In to This Campground" CTA on /campground/<slug>
//     and /campground/<slug>/updates routes to /quickcheckin?slug=…
//     &token=… instead of /signup?next=…
//   * /quickcheckin renders a public form (visibility + interests +
//     Complete Check-In) and the server action provisions a
//     throwaway auth user behind the scenes so the camper lands on
//     /home as a fully-checked-in camper with no email/password
//     friction.
//
// Slugs NOT in this list keep the existing flow (/signup → confirm
// email → /checkin), so production campgrounds aren't silently
// opted in to the lower-friction path.
//
// To allow a new campground, add its slug here. Slugs are stable
// across owner-side renames (the slug is generated once at signup
// and never auto-changes).

export const QUICK_CHECKIN_SLUGS: ReadonlySet<string> = new Set([
  // The seeded demo campground for end-to-end testing.
  'roadwave-demo-campground',
  // Mark's real test campgrounds used for production-style flow
  // walkthroughs.
  'final-stripe-test-campground',
  'test-stripe-campground',
])

export function isQuickCheckInSlug(slug: string | null | undefined): boolean {
  return typeof slug === 'string' && QUICK_CHECKIN_SLUGS.has(slug)
}

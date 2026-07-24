// Single source of truth for "which auth.users rows are throwaway demo/test
// accounts, safe to sweep." Both the manual reset script and the scheduled
// cleanup job import this -- keeping one copy prevents the exact drift bug
// that caused this to go unswept for 72 days in the first place (the sweep
// script's regex and the code comment describing it fell out of sync
// because there were two independent things to keep in agreement instead
// of one).
//
// Matches ONLY:
//   - demo-camper-N@example.com       (seeded by seed-demo-campground.mjs)
//   - quickcheckin-<random>@example.com (created by the quickcheckin
//     server action, exercised daily by tests/smoke.test.js's QR
//     check-in flow)
//
// @example.com is IANA-reserved for documentation use (RFC 2606) and
// cannot resolve mail for any real address -- no real camper or
// campground owner can ever hold an @example.com email, so this pattern
// is structurally incapable of matching a production account.
export const CLEANUP_EMAIL_RE =
  /^(demo-camper-\d+|quickcheckin-[a-z0-9]+)@example\.com$/i

export function isCleanupEligibleEmail(email) {
  return typeof email === 'string' && CLEANUP_EMAIL_RE.test(email)
}

# maintenance/backups

Point-in-time exports taken before a destructive maintenance operation, kept
as a paper trail. These are not restorable backups (Supabase Auth deletion is
a hard delete with no undo API) -- they're a record of exactly what existed
and what was removed, for audits and incident review.

## quickcheckin-cleanup-2026-07-24.csv

Full export of the 1,298 `quickcheckin-<random>@example.com` throwaway auth
users (created by `tests/smoke.test.js`'s QR check-in flow, accumulated
2026-05-13 through 2026-07-24 because `scripts/reset-demo-campground.mjs`'s
sweep regex never matched this email pattern) immediately before running
`node scripts/reset-demo-campground.mjs --apply` to delete them. Verified
before export: 100% `profiles.role = 'guest'`, zero `campground_admins`
rows, zero overlap with any non-`@example.com` account.

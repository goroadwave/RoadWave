# Known issues — follow-up after launch

Items acknowledged in code (typically via a `test.fixme` annotation
or a `// TODO(known-issue)` comment) but deliberately left for a
follow-up. Each entry has: severity, current observable behavior,
proposed fix, and pointers to the test/code that flags it.

---

## 1. Anonymous SELECT on `public.campgrounds` returns archived rows + leaks `owner_email` + `stripe_customer_id`

**Status:** RESOLVED on 2026-05-19 by migration
`supabase/migrations/0047_campgrounds_anon_read_hardening.sql`. The
regression test in `tests/qa/rls-anon-reads.test.js` is now active
(not `test.fixme`). GitHub issue #1 closed. Entry retained for
historical context.

**Severity:** moderate. Was not a launch blocker.

**Discovered by:** `tests/qa/rls-anon-reads.test.js` — the
`anon CAN read campgrounds (is_active=true rows only)` test.

**Observable today:**

Running this against production with only the public anon key:

```js
const anon = createClient(URL, ANON_KEY)
const { data } = await anon
  .from('campgrounds')
  .select('id, slug, name, is_active, owner_email, stripe_customer_id, trial_ends_at')
```

returns **every** campground row, including:

- archived rows (`is_active = false`)
- `owner_email` for those rows
- `stripe_customer_id` for those rows

The anon key is in every page's JS bundle, so anyone running the app
in a browser can fetch this list with one PostgREST call.

**Why this matters:**

- Once real owners sign up, their email addresses + Stripe customer
  IDs become enumerable by anyone.
- Stripe customer IDs alone cannot bill anything (the `sk_live_…`
  secret is needed to act on them), but they shouldn't be public.
- Email enumeration enables targeted phishing of RoadWave owners.

**Why it's not a launch blocker:**

- The currently-leaked owner emails are all pre-launch test variants
  of the founder's address; no real customer PII is exposed today.
- The logo upload flow (`uploadCampgroundLogoAction`) was hardened
  during this round to use a server-side ownership check + service
  role write, so it does NOT rely on Storage RLS or campground
  SELECT visibility for security.
- No write surfaces are affected — anon can only read.

**Proposed fix (new migration):**

1. Add a SELECT policy on `public.campgrounds` for the `anon` role
   that restricts to `is_active = true`.
2. Add a SELECT policy on `public.campgrounds` for the `authenticated`
   role that:
   - Allows owners to SELECT their own row (any `is_active` value)
     via the existing `campground_admins` join.
   - Allows other authenticated users to SELECT only `is_active = true`
     rows.
3. Consider revoking SELECT on the `owner_email` and
   `stripe_customer_id` columns from `anon` via column-level grants;
   move owner-facing access to authed routes / RPCs that join on
   `campground_admins`.
4. Verify the public welcome page at `/campground/[slug]` still
   renders for anon (it uses the service-role admin client per
   `src/app/campground/[slug]/page.tsx`, so should be unaffected).
5. Verify the `/admin/campgrounds` admin listing still works (it uses
   the authed service-role-aware path).
6. Re-enable the `test.fixme` in `rls-anon-reads.test.js` by
   converting it back to `test`.

**Effort:** one migration (~30 lines of SQL) plus regression-test
pass. Not blocking pre-launch.

---

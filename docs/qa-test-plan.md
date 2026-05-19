# RoadWave QA Test Plan

This document maps the QA matrix to test files and how to run each
suite. It exists so a future engineer can see, in one place, what's
asserted, what's gated on which environment, and what's deliberately
not automated yet.

## Suites

### `tests/smoke.test.js` — production-safe smoke

Read-only HTTP probes against the live site. One real anonymous
quickcheckin to the seeded demo campground per run (swept by
`scripts/reset-demo-campground.mjs`).

Default base URL: `https://www.getroadwave.com`. Override with
`PLAYWRIGHT_BASE_URL`.

### `tests/mobile-pages.test.js` — mobile viewport sweep

iPhone 14 Pro viewport (390×844). Visits every camper-facing and
owner-facing public page and asserts no 5xx, no error body text, and
no horizontal scrollbar at the document level. Production-safe.

### `tests/wave-roundtrip.test.js` — two-camper wave round-trip

Two isolated browser contexts both quickcheckin at the seeded demo
campground, navigate `/nearby`, click Wave, and verify the pipeline
flips the wave-button state — either to "Waved · waiting", "Mutual
wave …", or a graceful RLS-denied message. Production-safe (writes
only into the demo campground).

### `tests/qa/archive-visibility.test.js` — archived rows not public

Verifies the 5 historically archived test campgrounds return 404 at
their original AND renamed slugs, and that the 2 still-active
campgrounds (`roadwave-demo-campground`, `riverbend-rv-park`) still
return 200. Production-safe.

### `tests/qa/auth-gates.test.js` — owner/admin/camper routes gate anon

Anonymous traffic must be redirected away from `/owner/*`, `/admin/*`,
and authenticated camper routes (`/home`, `/nearby`, `/waves`, etc.).
Also confirms `POST /auth/sign-out?next=/owner/login` lands on
`/owner/login`, not `/`. Production-safe.

### `tests/qa/onboarding-email.test.js` — owner email render

Imports `renderOwnerOnboardingKitEmail()` and asserts the produced
HTML and plaintext bodies contain two distinct, properly-labeled
links (owner dashboard vs guest QR). Pure render — no SMTP. Catches
regressions of the launch-blocking "Open Your Dashboard sends owner
to /checkin" bug.

### `tests/qa/rls-anon-reads.test.js` — anon RLS sanity

Uses ONLY the anon Supabase key to attempt reads from sensitive
tables: `stripe_events`, `owner_signup_submissions`,
`campground_qr_tokens`, `legal_acks`, `notifications`, `waves`,
`crossed_paths`. Each must either error or return zero rows. Also
verifies anon CAN still read public.campgrounds (so welcome pages
keep working) but only sees `is_active = true` rows.

Skips when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
aren't in env. Safe against any environment because anon can't write.

### `tests/qa/stripe-checkout.test.js` — Stripe Checkout (TEST mode)

Drives `/owners/start` → Stripe-hosted Checkout. Asserts the visible
page shows **$39.00 monthly, 30-day free trial, $0 due today**, AND
that **Stripe Link is NOT shown**.

Gated on:
- `QA_ENV` set to `preview` or `local`
- `PLAYWRIGHT_BASE_URL` NOT pointing at production
- Implicitly: the target deployment must have test-mode Stripe keys
  (`sk_test_…` + a test-mode price ID + a test-mode webhook secret)

Creates one `owner_signup_submissions` row + one Stripe TEST customer
+ one Stripe TEST subscription per successful run. Cleanup guidance
is in the file footer.

Three additional sub-tests are documented STUBs for the next pass:
- Paying with `4242 4242 4242 4242` and landing on `/owners/success`
- Customer Portal opening for a signed-in test owner
- Cancellation flipping `subscription_status` to `canceled` via webhook

### `tests/qa/cross-owner-isolation.test.js` — multi-tenant boundary

All STUBs today; scaffolding ready. Tests to fill in:
- Owner A cannot read Owner B's campground via RLS
- Owner A cannot call `uploadCampgroundLogoAction` against Owner B
- Owner A cannot post a bulletin against Owner B's campground
- Camper cannot access `/owner/*`
- Camper cannot access `/admin/*`
- Plain Owner cannot access `/admin/*` without `profiles.role = 'super_admin'`

Gated on `QA_ENV=preview` + `SUPABASE_SERVICE_ROLE_KEY` available
(needed for minting magic-link sessions for two distinct test owners).

## One-command runs

```
# Production-safe smoke (default: against https://www.getroadwave.com)
npm run test:smoke

# Production-safe smoke against local dev
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:smoke

# QA suite against local dev (most tests; Stripe + cross-owner tests skip without QA_ENV)
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:qa

# QA suite against a Vercel Preview deployment WITH the Stripe-test gates unlocked
PLAYWRIGHT_BASE_URL=https://preview-deploy-url.vercel.app QA_ENV=preview npm run test:qa

# Full smoke + QA in one run
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

## Provisioning a preview environment

The Stripe + cross-owner suites need a Vercel Preview deployment
configured with TEST-mode Stripe keys + a test-mode webhook endpoint:

1. Push a branch (any non-`main`). Vercel creates a Preview deploy.
2. Confirm Preview-scoped env vars in Vercel:
   - `STRIPE_SECRET_KEY` = `sk_test_…`
   - `STRIPE_PRICE_ID_MONTHLY` = a `price_…` from Stripe **test mode**
   - `STRIPE_WEBHOOK_SECRET` = `whsec_…` from a Stripe test-mode webhook endpoint pointing at the preview URL
3. In Stripe Dashboard (test mode) → **Developers → Webhooks** → add an endpoint pointing at `https://<preview-deploy-url>.vercel.app/api/stripe/webhook` with the same six events as production:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Run: `PLAYWRIGHT_BASE_URL=<preview-url> QA_ENV=preview npm run test:qa`

## What we deliberately do NOT test automatically

- Real-card live payment (would cost real money).
- Resend email delivery via SMTP (Mailosaur integration is documented
  but the inbox-polling code is not implemented yet).
- Multi-region Supabase failover.
- Browser tabs other than Chromium. The Playwright config could add
  Firefox + WebKit projects if mobile cross-browser is in scope later.

## Cleanup

After any QA run that mutates the DB:

- Anonymous quickcheckins at the demo campground are swept by
  `scripts/reset-demo-campground.mjs --apply` (covers
  `demo-camper-N@example.com` only — the `quickcheckin-<rand>` users
  expire via the 24h cron).
- QA Stripe test signups can be archived with the SQL in the footer
  of `tests/qa/stripe-checkout.test.js`.
- No QA test deletes production rows; all cleanup is archive-only.

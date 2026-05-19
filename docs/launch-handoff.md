# RoadWave Launch Handoff — 2026-05-19

## 1. What is live now

| Item | Value |
|---|---|
| Production URL | https://www.getroadwave.com |
| Repo | https://github.com/goroadwave/RoadWave |
| `main` HEAD | `e8f34dd` "Land migration 0047: tighten anon RLS (closes #1)" |
| Vercel deployment | Production, `state: success`, serving with `Age: 0` |
| Public surfaces (200) | `/`, `/owners`, `/owners/start`, `/signup`, `/login`, `/owner/login`, `/demo`, `/campground/roadwave-demo-campground`, `/campground/riverbend-rv-park`, all footer legal pages |
| Owner funnel | `/owners/start` → live Stripe Checkout → onboarding email → `/owner/dashboard` |
| Camper funnel | `/signup` (full) or QR-only via `/campground/<slug>?token=…` for allow-listed demo slugs |
| Admin dashboard | `/admin/*` gated by `profiles.is_admin = true`; service-role-or-authed-admin reads |

## 2. What was tested and passed

| Suite | Tests | Last result |
|---|---|---|
| `npm run test:smoke` (smoke + mobile + wave round-trip) | 74 | ✅ 74/74 against production |
| `npm run test:qa` (archive visibility, auth gates, onboarding email, RLS, Stripe stubs, isolation stubs) | 64 total | ✅ 54 passed, 10 correctly gate-skipped (no `QA_ENV=preview`), 0 failed |
| Two-camper wave round-trip | 1 | ✅ |
| Manual Phase-4 live Stripe checkout (with cancel) | 1 | ✅ — $39/month, 30-day trial, $0 today, no Stripe Link, `cs_live_…` session, webhook events delivered, DB row provisioned, email sent, magic link landed on `/owner/dashboard`, portal cancel flipped status to `canceled` |
| Logo upload from `/owner/profile` (Test 10) | manual | ✅ via server-action ownership-checked path |
| Onboarding email links distinct (owner dashboard vs guest QR) | 5 | ✅ render-only test, asserts both HTML + plaintext |
| Migration 0047 post-apply verification | 6 conditions | ✅ all confirmed |

## 3. What Stripe settings are active

| Setting | Status |
|---|---|
| Mode | **Live** |
| Product | RoadWave Founding Pilot · Monthly |
| Price | $39.00 / month USD (recurring) |
| Trial | 30 days (set in `checkout/route.ts:68`, mirrored at DB layer in webhook + DB default + both non-Stripe paths) |
| Annual plan | not configured (`STRIPE_PRICE_ID_ANNUAL` unset on Vercel) — add when you launch annual |
| Customer Portal | Active in live mode, cancel-at-period-end enabled, ToS + Privacy URLs set |
| Webhook endpoint | `https://www.getroadwave.com/api/stripe/webhook`, 6 events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` |
| API secret key | `sk_live_…` (rotated 2026-05-19; old key has expired) |
| Vercel Production env | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY` all set to live values |
| Vercel Preview env | `STRIPE_SECRET_KEY` unset (Preview cannot make live charges); other Preview Stripe vars retain test-mode values |
| Internal new-owner alert | On every successful `checkout.session.completed`, an internal alert email fires to the address in `INTERNAL_NEW_OWNER_NOTIFY_EMAIL` (currently `getroadwave@gmail.com`, Production scope only). Subject `[RoadWave] New campground trial: <name>`. Best-effort try/catch — a failed alert never breaks the webhook. To change recipients, edit the Vercel env var (accepts a single address or comma-separated list); to silence the alerts entirely, unset it (code defaults to `hello@getroadwave.com` if you do). Implementation: `src/lib/email/internal-new-owner-alert.ts` + step 6b in `webhook/route.ts`. |
| Dead config | `STRIPE_TRIAL_DAYS` in Vercel — unused by code, you opted to leave it |

## 4. What demo campgrounds remain active

| Slug | Name | Purpose | `subscription_status` | Stripe sub |
|---|---|---|---|---|
| `roadwave-demo-campground` | RoadWave Demo Campground | Public demo backed by `scripts/seed-demo-campground.mjs`; the one slug in `QUICK_CHECKIN_SLUGS` allow-list; used by `/demo` flow + the canonical anonymous-quickcheckin smoke test | `active` | none (no `stripe_subscription_id`) |
| `riverbend-rv-park` | Riverbend RV Park | Pre-launch sample row from `supabase/seed.sql`; referenced by `home-phone-preview.tsx` hardcoded marketing mockup | `trial` | none |

Neither has a real Stripe subscription. Neither can bill anything. Both serve as public-visible sample campgrounds.

## 5. What test data was archived

5 campground rows, all with `is_active = false`, slug renamed to `_archived_*`, name prefixed `[ARCHIVED]`, `subscription_status = 'canceled'`:

| Original slug | Now | Stripe sub canceled? |
|---|---|---|
| `test-stripe-campground` | `_archived_test_stripe_2026_05_19` | yes (was test-mode — inert) |
| `final-stripe-test-campground` | `_archived_final_stripe_test_2026_05_19` | yes (was test-mode — inert) |
| `test-10` | `_archived_test_10_2026_05_19` | ✅ live-mode, canceled in Stripe Dashboard 2026-05-19 |
| `avalon` | `_archived_avalon_2026_05_19` | ✅ live-mode, canceled |
| `_archived_launch_test_2026_05_18` (Test 4) | unchanged — already archived | ✅ live-mode, canceled |

Audit trails preserved (`campground_admins`, `owner_signup_submissions`, `stripe_events`, `auth.users`). No DELETEs anywhere.

## 6. What RLS / security issue was fixed

**Anonymous read leak on `public.campgrounds`.**

Before migration 0047, the `campgrounds_select` policy from migration 0001 was `using (true)` for any role — anyone with the public anon key (embedded in every browser bundle) could `SELECT *` from `campgrounds` and read every row + every column, including:

- archived test rows (`is_active = false`)
- `owner_email` (PII)
- `stripe_customer_id`, `stripe_subscription_id`
- `subscription_status`, `plan`, `trial_*`, `current_period_end`
- `onb_*`, `email_notifications_enabled`, `welcome_email_sent_at`, `weekly_report_email_sent_at`

**Migration 0047** (`supabase/migrations/0047_campgrounds_anon_read_hardening.sql`) replaced the open policy with:

- Anon: `is_active = true` rows only
- Authenticated active: `is_active = true` rows
- Authenticated owner (existing 0012 policy): own row regardless of `is_active`
- Authenticated super_admin: every row
- Column-level: anon SELECT revoked on the table, then granted on 25 public-safe columns only (14 sensitive columns are now off-limits to anon)

Service role bypasses both layers, so the public welcome pages, the Stripe webhook handler, the logo upload server action, and the admin pages using the admin client all keep working unchanged.

## 7. What GitHub issue was closed

**Issue #1** — "RLS: anon SELECT on public.campgrounds leaks archived rows + owner_email + stripe_customer_id"

- Filed at https://github.com/goroadwave/RoadWave/issues/1
- Closed by commit `e8f34dd` via the `closes #1` keyword
- Closure-summary comment posted at https://github.com/goroadwave/RoadWave/issues/1#issuecomment-4489268279
- Regression test (`tests/qa/rls-anon-reads.test.js`) now active (was `test.fixme`); any future RLS regression on this surface fails the QA suite

## 8. Commands for future smoke tests

```sh
# Pre-deploy / daily smoke against production (read-only + one anonymous demo quickcheckin)
npm run test:smoke

# Smoke against local dev (when you're working on the camper-facing UI)
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:smoke

# Full QA suite against local dev (auth gates, archive visibility, email render, anon RLS)
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:qa

# Full QA against a Vercel preview deploy with Stripe TEST mode unlocked
PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app QA_ENV=preview npm run test:qa

# Type + build check
npm run build

# Lint
npm run lint

# Verify Vercel deploy status for HEAD
gh api "repos/goroadwave/RoadWave/commits/$(git rev-parse HEAD)/status" --jq .state

# Quick prod sanity (5 critical URLs)
for p in / /owners /owners/start /signup /campground/roadwave-demo-campground; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://www.getroadwave.com$p"
done
```

## 9. What to monitor after the first real campground signs up

| Surface | What to watch | Where |
|---|---|---|
| `stripe_events` table | New row for each of `checkout.session.completed`, `customer.subscription.created`, `invoice.paid` within seconds of checkout | Supabase SQL Editor: `select count(*), event_type from stripe_events group by event_type order by count(*) desc` |
| Stripe webhook delivery | Each event delivered HTTP 200, retry count = 0 | Stripe Dashboard → Developers → Webhooks → the live endpoint → Attempts |
| Onboarding email | Delivered to owner inbox within ~60 seconds, "Open Your Dashboard" lands on `/owner/dashboard` (not `/checkin`) | Resend Dashboard → Logs |
| **Internal new-owner alert** | Within ~60s of a successful checkout, an email arrives at the address in `INTERNAL_NEW_OWNER_NOTIFY_EMAIL` (currently `getroadwave@gmail.com`) with subject `[RoadWave] New campground trial: <name>`. Includes campground name + slug, owner name + email, signup timestamp, Stripe `cus_…` + `sub_…`, plan, trial-end, and links to the public page + `/admin/campgrounds`. If it doesn't arrive: check Resend logs first; the webhook handler wraps the send in try/catch and logs `[stripe/webhook] internal new-owner alert failed (non-fatal): …` on failure (the owner-facing email still goes out either way). | `getroadwave@gmail.com` inbox + Resend Dashboard → Logs |
| Magic-link consumption | `/auth/sign-in?th=…` → POST → `/owner/dashboard` | Vercel function logs (`[auth/sign-in]` prefix) |
| Trial timer | `campgrounds.trial_ends_at = trial_started_at + 30 days` | `select trial_started_at, trial_ends_at, (trial_ends_at - trial_started_at) as len from campgrounds where slug = '<new>'` |
| Day 30 (first real charge) | `invoice.paid` event fires; webhook flips `subscription_status: 'active'`; first $39 captured | Stripe Dashboard → Payments + `stripe_events` table |
| Failed payments | `invoice.payment_failed` → `subscription_status: 'past_due'` + payment-failed email sent to owner | Stripe Dashboard → Failed payments + Resend logs |
| Logo upload error rate | `[logo-upload]` warnings in Vercel logs | Vercel → Functions → logs |
| `profiles.role` for new owner | Should be `'owner'` (not `'guest'`) after webhook runs | `select role from profiles p join campground_admins ca on ca.user_id = p.id where ca.campground_id = '<new>'` |
| Owner support email | `hello@getroadwave.com` inbox | Wherever that's routed |

## 10. Emergency rollback steps

### A — Production deployment broken (any route returning 5xx)

Vercel Dashboard → Deployments → previous green deployment → **Promote to Production**. Brings you back to a known-good build in seconds. The previous good build before the most recent change is `8ed008b`, and before that `130e6f6`.

### B — Stripe live keys leaked or compromised

1. Stripe Dashboard (live) → Developers → API keys → **Roll key** on the Secret key row → set expire-previous-key to "1 hour" → copy new `sk_live_…`.
2. In Vercel → Production env → update `STRIPE_SECRET_KEY` to the new value.
3. Redeploy production (any redeploy works).
4. Verify: do a partial signup at `/owners/start` and confirm the resulting `stripe_session_id` in `owner_signup_submissions` is `cs_live_…`.
5. We did exactly this dance on 2026-05-19 (phase R.1–R.4 in the launch session) — same procedure if you need to do it again.

### C — Webhook handler regression (signups create Stripe subs but no DB campground)

1. Symptom: `stripe_events` has new rows but `campgrounds` doesn't grow.
2. Inspect Vercel function logs for `[stripe/webhook]` errors.
3. Stripe Dashboard → Developers → Webhooks → the endpoint → click any failed delivery → **Resend** after the fix is deployed (handler is idempotent via `stripe_events.stripe_event_id` unique constraint, so resending is safe).
4. If a customer was charged but no campground exists, manually provision via `/owner/setup` (path described in `provisionCampgroundAction`) using the customer's email.

### D — Real owner stuck on `profiles.role = 'guest'` (would land on `/checkin` instead of dashboard)

Should not happen post-`e916407`, but if it does:

```sql
update public.profiles
   set role = 'owner'
 where id in (
   select user_id from public.campground_admins where role = 'owner'
 )
   and role = 'guest';
```

Same SQL used to backfill 2 previously-stuck owners on 2026-05-19.

### E — Migration 0047 broke some unexpected query

```sql
-- Restore the migration 0001 open policy (emergency only)
create policy campgrounds_select on public.campgrounds for select using (true);
-- Restore broad anon column access (emergency only)
grant select on public.campgrounds to anon;
-- Then drop the 0047-added policies
drop policy if exists campgrounds_select_anon on public.campgrounds;
drop policy if exists campgrounds_select_authed_active on public.campgrounds;
drop policy if exists campgrounds_select_admin on public.campgrounds;
```

This restores pre-0047 behavior in ~5 seconds. Re-opens the privacy issue, so use only if something genuinely broken can't be fixed forward.

### F — Test campground row needs to come back active

```sql
-- Reverse the archive for one row (replace slug + name as needed)
update public.campgrounds
   set is_active = true,
       slug = 'desired-real-slug',
       name = 'Desired Real Name'
 where id = '<the-archived-id>';
```

Pair with re-canceling or re-creating the Stripe subscription if you need billing to resume.

### G — Owner accidentally deletes their campground

There is no DELETE from owners by design — `clearLogoAction` + profile actions only `update`. If someone runs SQL directly and deletes a row, restore from Supabase point-in-time recovery (Dashboard → Database → Backups). Daily backups are retained per your Supabase plan.

### H — Rollback the entire most-recent commit

```sh
git revert e8f34dd --no-edit && git push origin main
```

Vercel auto-deploys. Useful if a code change ships a bug that affects the funnel.

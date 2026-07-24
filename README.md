# RoadWave

Privacy-first campground connections for RVers. Built with Next.js 16, Supabase, and Tailwind CSS v4.

## Features

- Username-first signup with live availability check
- Email verification gate enforced at the database level (no check-in until verified)
- Privacy/Terms acknowledgment with versioned legal log
- Profile setup with eight per-field sharing toggles (rig type, miles driven, hometown, status tag, personal note, years RVing, pet info, interests)
- QR-based campground check-in with 24-hour automatic expiry
- Nearby campers list with seven-interest filter
- Mutual wave mechanic — wave is private until both sides wave back
- Three privacy modes: Visible, Quiet, Invisible — enforced in RLS, not just app code
- Crossed Paths log of mutual matches
- Meetup spots board for campground hosts to post activities

## Tech stack

- Next.js 16 (App Router, Server Components, Server Actions)
- Supabase (Auth + Postgres with Row-Level Security + Edge Functions)
- TypeScript, Tailwind CSS v4, Zod
- `html5-qrcode` for camera-based QR scanning, `qrcode` for QR generation

## Project structure

```
src/
  app/
    (auth)/{signup,login,verify}      Public auth pages
    (app)/                            Auth-gated pages
      home/                           Signed-in dashboard
      checkin/                        QR scan + manual entry + active stays
      nearby/                         Filterable camper list with wave button
      crossed-paths/                  Mutual wave matches
      meetups/                        Campground activity board
      profile/setup/                  Display name + sharing toggles + interests
      privacy/                        Visible / Quiet / Invisible mode picker
      admin/campgrounds/              Dev-only QR generator
    auth/{callback,sign-out}          Route handlers
    api/cron/expire-checkins/         HTTP cron fallback (Vercel Cron etc.)
  components/                         UI organized by feature
  lib/
    supabase/                         Browser, server, and service-role clients
    types/db.ts                       Row types
    validators/                       Zod schemas
    constants/                        Interest catalog, terms versions
    actions/                          Cross-feature server actions (e.g., waves)
  proxy.ts                            Session-refresh proxy (Next.js 16 convention)

supabase/
  migrations/0001_init.sql            Tables, RLS, triggers, RPCs
  migrations/0002_checkin_security.sql Token table moved out of public read path
  cron.sql                            pg_cron schedule for the 24h sweep
  seed.sql                            Two sample campgrounds
  functions/expire-checkins/index.ts  Optional Supabase Edge Function
```

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with values from your Supabase project (Settings → API):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Publishable" / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | "Secret" / service role key — never ship to a client |
| `CRON_SECRET` | Generate with `openssl rand -hex 32` |

### 3. Apply the database schema

In the Supabase SQL editor, run the migrations in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_checkin_security.sql`
3. `supabase/seed.sql` — two sample campgrounds for local testing

### 4. Turn on email confirmation

Supabase Dashboard → Authentication → Providers → Email → **Confirm email = ON**.

Then Authentication → URL Configuration → set Site URL to `http://localhost:3000` (and add your production URL when you deploy).

### 5. Schedule the 24-hour expiry sweep

Pick **one** of these approaches:

- **pg_cron (recommended)** — Database → Extensions → enable `pg_cron`, then run `supabase/cron.sql`.
- **Edge Function** — `supabase functions deploy expire-checkins`, then add a Supabase scheduled trigger pointed at it.
- **Vercel Cron** — when deploying to Vercel, add to `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/cron/expire-checkins", "schedule": "*/10 * * * *" }
    ]
  }
  ```
  Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically when `CRON_SECRET` is set as a Vercel env var.

### 6. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

## Manual test flow

1. **Sign up** at `/signup` — pick a username, watch the live availability check.
2. **Verify your email** via the link Supabase sends.
3. **Set up your profile** at `/profile/setup`. Toggle a few share switches off.
4. **Find a QR** — visit `/admin/campgrounds`. Click one of the `/checkin?token=...` URLs to simulate a scan.
5. **Confirm check-in** → land on `/nearby`.
6. **In a second browser** (incognito), repeat steps 1–5 with a different account at the same campground.
7. **Wave** at each other from `/nearby`. Reload to see "Crossed paths!" once both directions are recorded.
8. **`/crossed-paths`** lists the match with the matched user's full (still toggle-redacted) profile.
9. Try `/privacy` to switch between Visible, Quiet, Invisible. Watch how the second account's `/nearby` reflects the change.

## Granting host access for meetups

Posts to the meetup board are gated to `campground_admins`. To make a user a host of one of the seed campgrounds, run in the Supabase SQL editor:

```sql
insert into public.campground_admins (campground_id, user_id, role)
values (
  (select id from public.campgrounds where slug = 'riverbend-rv-park'),
  '<your-user-id-here>',
  'host'
);
```

Find your user ID via Supabase Dashboard → Authentication → Users.

## Privacy contract — where the guarantees live

The privacy guarantees are enforced **in the database**, not just in the app:

- **`profiles_select_own` + `profiles_select_matched`** — direct SELECTs only succeed for your own profile and confirmed mutual matches.
- **`nearby_campers()`** RPC — the only path to read other users' profiles. SECURITY DEFINER, redacts each field based on the target's `share_*` toggles.
- **`waves_insert_targeted`** RLS policy — verifies sender isn't Invisible, target is Visible, both are actively checked in to the same campground.
- **`waves_select_own_outgoing`** — recipients cannot SELECT inbound waves; the only signal of an inbound wave is via the mutual-match trigger.
- **`try_create_crossed_path`** trigger — fires on wave INSERT, creates a `crossed_paths` row only if the reverse direction already exists.
- **`check_ins_insert_verified`** — INSERT requires `profiles.email_verified_at IS NOT NULL`.
- **`campground_qr_tokens`** — admin-only table, no RLS policies, so QR tokens are never exposed to clients. Reads happen through `preview_campground_by_token()` and `checkin_by_token()` RPCs.
- **`expire_old_check_ins()`** — sweeps active check-ins past `expires_at`. Runs via pg_cron, an Edge Function, or `/api/cron/expire-checkins`.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import into Vercel.
3. Add the four env vars from `.env.local` to the Vercel project settings.
4. Deploy. Then add `vercel.json` for cron (see above).
5. In Supabase, update Authentication → URL Configuration → Site URL to your production URL, and add it to the redirect allow-list.
6. Production sanity check: try a fresh signup → email link → set up profile → check in.

## Maintenance — demo/test account cleanup

### What caused this

`tests/smoke.test.js` runs an "Unauthenticated first-time camper QR
check-in" test daily (`.github/workflows/e2e-smoke.yml`) against
production. It provisions a throwaway `quickcheckin-<random>@example.com`
auth user via the `quickCheckInAction` server action
(`src/app/quickcheckin/actions.ts`), then abandons it — there's no
"resume" or cleanup path in the test itself by design (it's exercising a
real first-time signup, not a fixture).

`scripts/reset-demo-campground.mjs` existed to sweep these up, but its
regex only ever matched the older `demo-camper-N@example.com` seed
pattern — never `quickcheckin-<random>@example.com` — despite a code
comment claiming otherwise. The two email patterns were defined
independently in two places (a comment in one file, a regex in another)
with nothing keeping them in sync, and they silently drifted apart. By the
time this was caught (2026-07-24), **1,306 throwaway accounts** had
accumulated since the test was added on 2026-05-13 — 99% of the project's
total `auth.users` table.

Separately, that same day, a scheduled CI run failed: the mobile-safari
copy of the QR check-in test hit `admin.auth.admin.createUser()` erroring
transiently against Supabase's Auth Admin API (`invalid JWT ... unrecognized
JWT kid`). The failure was real (the app correctly showed "We couldn't set
up your demo check-in" and declined to redirect) and server-side —
nothing about the requesting browser caused or could have prevented it.

### Why the retry exists

`createDemoUserWithRetry` in `src/app/quickcheckin/actions.ts` retries
`createUser` up to 3× with backoff so a single transient Supabase Auth
blip doesn't fail a real camper's check-in. If a retry comes back
"duplicate email," that means an earlier attempt actually succeeded
server-side but its response was lost to the same transient error —
the retry recovers that already-created user via lookup instead of
erroring out (email is a fresh `crypto.randomUUID()` per call, so a
duplicate can only ever mean "I already made this one"). Every
attempt/failure/recovery emits a structured JSON log line
(`scope: "quickcheckin.createUser"`) so retry frequency is visible in
Vercel's log search rather than only surfacing as a user-facing error.

### How the cleanup works

Two scripts, both built on the shared pattern in
`scripts/lib/demo-account-patterns.mjs` (kept in one place specifically so
the drift above can't recur):

- **`scripts/reset-demo-campground.mjs`** — manual, on-demand, full wipe.
  Clears all activity (bulletins/meetups/check-ins/events) and deletes
  every matching throwaway auth user regardless of age. Use this before a
  live demo/presentation to reset the campground to a clean slate.
  ```bash
  node scripts/reset-demo-campground.mjs            # dry-run
  node scripts/reset-demo-campground.mjs --apply    # actually delete
  ```

- **`scripts/cleanup-expired-demo-accounts.mjs`** — scheduled, unattended,
  age-gated. Run weekly by `.github/workflows/cleanup-demo-accounts.yml`
  (Sundays 06:00 UTC), or manually via `workflow_dispatch` (defaults to a
  dry-run preview unless you explicitly pass `dry_run: false`). Only
  deletes accounts **older than 48 hours** — double the app's own 24h
  check-in expiry — so an account created by a smoke test that happens to
  be running at the same moment is never touched. Aborts without deleting
  anything if the eligible count exceeds a safety cap
  (`CLEANUP_MAX_DELETE_PER_RUN`, default 2000), on the theory that a
  logic bug should fail loudly rather than mass-delete silently. Emits
  structured JSON log lines for every scan/retry/delete/failure, and
  writes a Markdown summary (accounts scanned, matched, eligible, deleted,
  failed, retry count, duration) to the GitHub Actions job summary.
  ```bash
  node scripts/cleanup-expired-demo-accounts.mjs            # dry-run
  node scripts/cleanup-expired-demo-accounts.mjs --apply    # actually delete
  ```

Both scripts refuse to run unless the `roadwave-demo-campground` row's
name is exactly `"RoadWave Demo Campground"`, and both only ever match
`demo-camper-N@example.com` / `quickcheckin-<random>@example.com` —
`@example.com` is IANA-reserved (RFC 2606) and cannot resolve mail for any
real address, so no production account can structurally match either
pattern.

**Requires the `SUPABASE_SERVICE_ROLE_KEY` GitHub secret** to run in CI
(Settings → Secrets and variables → Actions). `NEXT_PUBLIC_SUPABASE_URL`
is already configured there; the service-role key is not, by design —
it's the kind of credential that should be added deliberately by a repo
admin, not by automation.

### How to recover if cleanup ever fails

Both scripts are read-then-delete, not transactional — a failure partway
through leaves whatever was already deleted, deleted, and reports exactly
which accounts it didn't get to (both scripts print a `FAILED to delete...`
list / `cleanup.failures` log event with ids). Just re-run the same
command; it's idempotent — accounts already deleted no longer match, so a
second run only touches what's left over.

There is **no undo** for a completed deletion. `admin.auth.admin.deleteUser()`
is a hard delete with no soft-delete or restore API. Before any manual
`--apply` run against production, export a CSV first (see
`maintenance/backups/` for the format used during the 2026-07-24
cleanup) — it can't resurrect a working account, but it's a full record of
what existed for audits. The scheduled workflow does this automatically
every run (`actions/upload-artifact`, 90-day retention). If your Supabase
project has point-in-time recovery enabled, that's the only path to an
actual restore, and it's a project-level database restore done from the
Supabase dashboard, not something either script can do.

## Future work

- Real-time match notifications (Supabase Realtime subscription on `crossed_paths`)
- Campground-host management UI (replace SQL-based admin grants)
- Profile photo uploads
- Push notifications for new meetups + matches
- Internationalization for terms and privacy policy versions
- Rate limiting on the wave action

## License

MIT (or your choice).

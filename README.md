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

## Future work

- Real-time match notifications (Supabase Realtime subscription on `crossed_paths`)
- Campground-host management UI (replace SQL-based admin grants)
- Profile photo uploads
- Push notifications for new meetups + matches
- Internationalization for terms and privacy policy versions
- Rate limiting on the wave action

## License

MIT (or your choice).

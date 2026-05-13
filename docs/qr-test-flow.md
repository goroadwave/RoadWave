# RoadWave QR / check-in test flow

End-to-end acceptance checklist for walking the camper → owner →
admin loop on the seeded **RoadWave Demo Campground**. Strictly
scoped — touching this flow never affects real owner data.

## What was seeded

After running `node scripts/seed-demo-campground.mjs --apply`:

| Thing | Value |
|---|---|
| Campground name | RoadWave Demo Campground |
| Slug | `roadwave-demo-campground` |
| Owner email | `demo@getroadwave.com` |
| QR token (URL param) | `cc21f1d1-5ffa-4dcd-ba72-d475c847ac41` |
| **Camper QR URL** | https://www.getroadwave.com/campground/roadwave-demo-campground?token=cc21f1d1-5ffa-4dcd-ba72-d475c847ac41 |
| Pre-seeded campers | 6 (3 Visible, 1 Quiet, 1 Invisible, 1 Updates-Only) |
| Pre-seeded bulletin | "Welcome campers! Coffee meetup tomorrow at 9 AM near the clubhouse." |
| Pre-seeded meetup | "Sunset walk" (+6h, meet at flagpole) |

The QR URL above is what your printable QR card encodes. The token is
stable across re-seeds (only changes if you click "Regenerate QR" on
`/owner/qr`).

## A. Owner side

1. Open `https://www.getroadwave.com/owner/login`
2. Enter `demo@getroadwave.com` → click the magic-link button
3. Check the email (the inbox doesn't exist publicly — for this demo
   you can generate a magic link manually via
   `scripts/provision-admin-campground.mjs` or use the Supabase
   Dashboard → Authentication → Users → demo@getroadwave.com → Send
   magic link)
4. Click the magic link → `/auth/sign-in` confirmation page → "Open
   Dashboard"
5. You should land on **`/owner/dashboard`** showing:
   - Trial banner (active, ~12 months out — seed sets `subscription_status='active'`)
   - This-week stats: QR scans, check-ins (≥6), bulletin views
   - Visibility breakdown: 3 Visible, 1 Quiet, 1 Invisible, 1 Updates-Only
   - Promo kit links
6. Click **QR code** in the nav → `/owner/qr`
   - The QR PNG renders branded (dark navy bg, amber accents,
     RoadWave logo)
   - Buttons: Download 8.5×11 PDF, Download 5×7 PDF, Download PNG,
     Print, Regenerate QR
   - Copy the check-in URL — should match the URL above
7. Open the QR URL on your phone (or scan the printed QR with another
   phone) → continue to section **B**

## B. Camper side (do this on your phone or in an incognito window)

1. Open the **Camper QR URL** above
2. You land on `/campground/roadwave-demo-campground?token=…`
   - Renders the **public welcome page**: campground name, two CTAs
     ("Get started — it's free" and "See updates without an account"),
     four-step how-it-works, privacy promise
   - If you're already signed in as a camper, middleware redirects you
     to `/checkin?token=…` instead
3. **First-time camper path:**
   - Tap "Get started" → `/signup` with `?next=/checkin?token=…`
     preserved
   - Sign up with a throwaway email (e.g. `mytest+rw@example.com`) — a
     middleware cookie remembers the token through the whole signup
     flow
   - Confirm email (Resend will email you)
   - You'll land on `/checkin?token=…` with the campground name + Check
     In button visible
4. Tap **Check In**
   - Server action `checkInAction` fires
   - **NEW**: logs `check_in_started` then `check_in_completed` to
     `campground_events`
   - Redirects to `/nearby`
5. **After check-in you should see:**
   - **`/home`** — welcome card with the campground name, the seeded
     bulletin, the seeded meetup, "Where the action is" tiles
   - **`/nearby`** — the 3 Visible demo campers (Sage, Marcus, Priya)
     with their interests + status tags. Quiet/Invisible campers are
     hidden from the list per RLS.
   - **`/meetups`** — the seeded "Sunset walk" meetup
   - **Privacy controls** — `/settings/privacy` lets you flip your own
     visibility mode

## C. Owner dashboard — confirm the new check-in landed

1. Switch back to the owner-logged-in window
2. Hit `/owner/dashboard` (or just refresh)
3. The active check-in count should be **at least 7** now (6 seeded +
   your new test camper)
4. Visibility breakdown updates (Visible should be 4 if you stayed on
   Visible, etc.)
5. Open **`/owner/bulletin`**
   - Edit the bulletin: "Welcome campers! Coffee meetup tomorrow at 9
     AM near the clubhouse." → change to something distinctive like
     "**TEST UPDATE — pickleball at 4pm**" → Save
6. Open **`/owner/meetups`**
   - Add a new meetup: title `Test meetup from owner`, location
     `Picnic table 3`, start_at = today +2h → Save

## D. Camper side again — confirm bulletin + meetup propagate

1. Switch back to camper window
2. Refresh `/home`
3. You should see the **new bulletin text** in the bulletin card
4. Open `/meetups`
5. You should see **both meetups** (Sunset walk + Test meetup from owner)
6. Bulletin view fires a `bulletin_view` event → admin will see it

## E. Admin side — confirm activity stream

1. In a third window (or sign out the camper) → `/login`
2. Sign in with an account that has `profiles.is_admin = true`
3. Open `/admin/activity`
4. **Top section** — aggregate counts:
   - Active check-ins should be ≥ 7
   - Bulletins today should be ≥ 1
   - Visibility breakdown matches owner dashboard
5. **NEW: bottom section** — "Last 50 events across all campgrounds":
   - You should see a row for `Check-in completed` · RoadWave Demo
     Campground (your camper just checked in)
   - Row for `Bulletin view` if you opened the campground page
   - Rows for any `pulse_great` / `pulse_good` / `pulse_needs_attention`
     taps from the engagement hub
   - Auto-refreshes every 60 seconds
6. Open `/admin/campgrounds`
   - You should see a new **"Demo campground"** card at the top with
     the "Reset Demo Campground" button (amber outline)
7. Open `/admin/inbox` — any contact-office messages or campground
   submissions show here

## F. Reset for the next demo

Two paths, same result:

**From the terminal:**
```bash
node scripts/reset-demo-campground.mjs --apply
node scripts/seed-demo-campground.mjs --apply
```

**From the admin UI:**
1. `/admin/campgrounds` → "Reset Demo Campground" → click → click "Confirm reset"
2. Clears bulletins / meetups / check-ins / events / demo campers
3. Re-run `node scripts/seed-demo-campground.mjs --apply` locally to
   repopulate (the admin button doesn't re-seed; it only clears)

## How to post a bulletin or meetup as the owner

**Bulletin** (text-only, expires_at optional):

1. Sign in as `demo@getroadwave.com`
2. `/owner/bulletin` → enter message (max 280 chars) → category
   (event / special / alert / general) → optional expiry → Save
3. Bulletin appears immediately on every checked-in camper's
   `/home` for this campground

**Meetup** (structured, with start time):

1. `/owner/meetups` → New meetup → fill title, description,
   location, start_at (optional end_at) → Save
2. Meetup appears immediately on every checked-in camper's
   `/meetups` for this campground

Both write to RLS-protected tables: only the owner of the campground
can write; only checked-in campers see the rows for that campground.

## Safety reminders

- The demo campground is `is_active=true` and lives in production
  Supabase, but it's **slug-scoped** — every seed/reset/admin script
  hardcodes the slug `roadwave-demo-campground` and refuses to touch
  any other campground
- Demo camper auth users use `demo-camper-N@example.com` — the
  `@example.com` TLD is reserved and won't deliver email anywhere
- The QR token is generated server-side and doesn't expire (only
  rotates if you click "Regenerate QR" on `/owner/qr`)
- Production environment variables, Stripe settings, RLS policies,
  auth rules, and admin permissions are **not changed** by any of this

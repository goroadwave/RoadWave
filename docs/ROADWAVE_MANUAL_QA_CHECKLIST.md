# RoadWave — Manual QA Checklist

> **Companion to** `docs/ROADWAVE_SITE_MAP.md`.
> **Last updated:** 2026-05-28 (post route-cleanup, commit `f096d96`).
> Run against **production** (`https://www.getroadwave.com`) unless noted. The automated smoke suite (`npm run test:e2e` / `tests/smoke.test.js`) covers route health; this checklist covers the **authenticated, stateful, and billing flows** the smoke suite can't fully exercise.

**Test-data safety rules**
- Use a clearly-labeled identity: campground "RoadWave Production Signup Test", email `markhalesmith+test@gmail.com`.
- Never use a real customer campground (e.g. Lake Waldena).
- After any real Stripe checkout, **cancel the test subscription** and clean up the test records.

---

## 1. QR-only camper scans the campground page
- [ ] Open a campground QR URL: `/campground/<slug>?token=<uuid>` (use the seeded demo campground).
- [ ] Hub loads: Wi-Fi, map, rules, amenities, check-in/out times, bulletins, meetups, weather notices, office message, reviews/rebooking all render.
- [ ] The "Meet other campers — optional" / "Join Camper Connections" CTA is visible.
- [ ] Tapping it routes to `/quickcheckin?slug=…&token=…` (no-signup form), **not** `/signup`.
- [ ] Complete quick check-in → lands on `/home` with a "Checked in at <campground>" chip.
- [ ] No Riley bubble overlaps the content on mobile.

## 2. Signed-in camper nav — Camper Connections (no `/nearby` flash)
- [ ] As a signed-in camper **checked into a campground**, tap **Camper Connections** in the bottom nav.
- [ ] You land **directly** on `/campground/<slug>#camper-connections` (scrolled to the connections section) — **no `/nearby` redirect flash**.
- [ ] On the campground hub itself, the **Camper Connections** tab jumps to the in-page `#camper-connections` section.
- [ ] As a signed-in camper **not checked in**, tapping Camper Connections → `/checkin` (no dead end).

## 3. Past Waves — list, conversation, alias
- [ ] Tap **Past Waves** in the nav → `/crossed-paths` loads the connections list (heading reads "Past Waves").
- [ ] Open a connection → `/crossed-paths/[id]` conversation thread loads; send a reply; it persists on refresh.
- [ ] Visit `/past-waves` directly → redirects cleanly to `/crossed-paths` (Past Waves).
- [ ] Empty-state copy reads "Past Waves" (no "Crossed Paths" wording in UI).

## 4. Waves — receive, Lantern, Wave Back, becomes a Past Wave
- [ ] Camper B sends a wave to Camper A (use two test campers checked into the same campground).
- [ ] Camper A's **Lantern** shows the new-wave notification; opening it routes to `/waves/incoming/[id]`.
- [ ] The incoming wave card is privacy-redacted (no exact site number); **Wave Back** works.
- [ ] After mutual wave, a connection appears in **Past Waves** (`/crossed-paths`) for both campers.
- [ ] **Ignore** on an incoming wave removes it without notifying the sender.

## 5. Office Messages — camper → owner → reply thread
- [ ] From the QR hub, a camper sends an office message (category + body) via "Send to office".
- [ ] Owner sees it in `/owner/messages` (Active tab); the seeded thread shape is correct.
- [ ] Owner replies; the reply is delivered.
- [ ] Camper opens the `/m/[id]?t=…` token-gated thread, verifies via site#+last name, and sees the reply / can respond.
- [ ] No other campground's messages are visible from the token link.

## 6. Owner signup → Stripe → dashboard → billing (then cleanup)
- [ ] Every "Start Free 30-Day Trial" / "Start My Campground Pilot" CTA lands on `/owners/start`.
- [ ] `/owners/start` form submits → **live Stripe Checkout** opens ("RoadWave USA LLC", 30 days free, then $39/mo, **$0 due today**).
- [ ] Complete checkout with a real card → routed to `/owners/success`.
- [ ] Magic-link email arrives → clicking it lands on **`/owner/dashboard`** (via `/auth/sign-in`).
- [ ] `/admin/inbox` shows the submission, status flips to **provisioned**.
- [ ] `/owner/billing` shows **Trial** with the correct end date.
- [ ] **Cleanup:** cancel the test subscription (owner billing tab or Stripe dashboard); expire any leftover Checkout Session; remove the test `owner_signup_submissions` row.
- [ ] `/owner/signup` typed directly → 308 redirect to `/owners/start`.

## 7. Owner dashboard — everything loads
- [ ] `/owner/dashboard` loads with stats + trial banner.
- [ ] `/owner/messages`, `/owner/bulletin`, `/owner/meetups`, `/owner/marketing` (incl. Weather & Safety composer + reviews/rebooking), `/owner/qr` (+ `/owner/print/front-desk-card`), `/owner/analytics`, `/owner/billing` all load without error.
- [ ] `/owner/preview` renders the guest-hub preview with the preview banner (no Riley).
- [ ] Campground switching: a multi-campground owner can reach each campground's dashboard (note: no dedicated switcher UI yet — verify routing behavior).

## 8. Admin — loads and is gated
- [ ] As a **non-admin / anonymous** user, `/admin`, `/admin/activity`, `/admin/campgrounds`, `/admin/users`, `/admin/inbox`, `/admin/health` all redirect to login (never render data).
- [ ] As an **admin**, each of those loads: activity feed, campground list (trial extend), users, inbox (submissions), health page.
- [ ] `/api/admin/health` and `/api/email/test` reject non-admins.

## 9. Auth returnTo / `next`
- [ ] Signed **out**, open `/waves` directly → redirected to `/login?next=%2Fwaves`.
- [ ] Sign in → land **back on `/waves`** (not a generic `/home` or campground hub).
- [ ] Repeat for `/crossed-paths` and `/meetups` (deep-link → login → return to intended page).
- [ ] QR → login → hub path preserves the pending check-in token and returns to the campground hub.

## 10. Demo Center
- [ ] `/demo-center` and `/demo-center/camper`, `/demo-center/owner`, `/demo-center/walkthrough` all load with no console errors.
- [ ] All trial CTAs are green and point to `/owners/start` (zero links to `/owner/signup`).
- [ ] **Riley is NOT present** on any demo page (no floating bubble / glow circle).
- [ ] Footer is the compact mobile accordion; no horizontal overflow at 390px.

---

## Routes to remove later — NOT now

> Deliberately deferred. Do not delete until the stated condition is confirmed.

1. **`src/components/owner/owner-signup-form.tsx` + `src/app/owner/signup/actions.ts`** — dead code behind the `/owner/signup` → `/owners/start` redirect. Remove **after a few days of signup-flow soak testing** confirms the consolidated `/owners/start` flow is healthy in production.
2. **`/start/welcome`** — remove **after** its content is merged into `/owners/success` and the merge is confirmed (then redirect `/start/welcome` → `/owners/success`).
3. **`/campground/[slug]/updates`** redirect stub — remove **after** confirming no inbound links (internal nav, emails, QR materials, external bookmarks).
4. **`/nearby` page file** — remove **only after** confirming nothing still needs it: the camper nav fallback, remaining `href="/nearby"` links (home tile, `/waves`, `/crossed-paths` empty state, `active-check-ins`), and `revalidatePath('/nearby')` calls. Keep the redirect until those are repointed.
5. **Possible `/demo` consolidation into `/demo-center`** — only after deciding the demo front-door strategy (legacy Pages-Router `/demo` interactive demo vs the App-Router `/demo-center` hub). Larger UX decision; not urgent.

**Do not touch (not cleanup targets):** `/auth/sign-in` (Stripe magic-link surface), `/owners/start` (canonical signup), any Stripe/billing route, admin gating, the QR campground hub.

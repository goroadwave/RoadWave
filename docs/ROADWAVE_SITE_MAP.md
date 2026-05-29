# RoadWave — Site Map & Route Inventory

> **Status:** reflects the codebase **after the route-cleanup change set** (commit `f096d96`).
> **Last updated:** 2026-05-28.
> **Scope:** documentation only — no route or behavior changes are implied by this file.

## Conventions

- **Framework:** Next.js App Router (`src/app`) **+ one legacy Pages-Router page** (`src/pages/demo.jsx`).
- **Route groups** (parenthesized folders don't appear in the URL):
  - `(app)` → camper area; auth-gated in `src/app/(app)/layout.tsx`.
  - `(auth)` → camper auth pages.
  - `owner/(authed)` → owner area; auth-gated in `src/app/owner/(authed)/layout.tsx`.
  - `admin` → admin-gated via `requireAdmin()` in `src/app/admin/layout.tsx`.
- **Middleware** (`src/lib/supabase/middleware.ts`) only refreshes the Supabase session + injects `x-pathname` / `x-search`. It performs **no redirects**; all gating lives in layouts/pages.
- **Columns:** **Login** / **Admin** = required (Y/N). **Canon/Legacy** = canonical vs duplicate/redirect/alias. **Risk** = operational / confusion / data-loss risk.

---

## 1. Public / Marketing routes

| Route | Purpose | Login | Admin | Params | Canon/Legacy | Risk | Notes |
|---|---|---|---|---|---|---|---|
| `/` | Homepage (camper hero; redirects signed-in users to their area) | N | N | — | Canon | low | → `/demo`, `/owners`, `/signup`. Routes expired magic links → `/auth/sign-in?error=expired` |
| `/owners` | Owner marketing / explainer | N | N | — | Canon | low | CTAs → `/owners/start`, `/demo`; mounts `CampgroundRileyButton` |
| `/owners/how-it-works` | Owner step-by-step | N | N | — | Canon | low | CTAs → `/owners/start` |
| `/owners/start` | **Canonical owner trial intake (Stripe)** | N | N | — | **Canon** | **high** | Live Stripe checkout funnel; billing/signup |
| `/owners/success` | Post-checkout "Trial activated" | N | N | `?session_id` | Canon | med | Sends magic link → `/auth/sign-in`; Stripe-adjacent |
| `/start/welcome` | "Your Pilot Is Active" welcome | N | N | query | Canon-ish | med | **Overlaps `/owners/success`** (two activation pages) |
| `/about` | About | N | N | — | Canon | low | footer |
| `/contact` | Contact | N | N | — | Canon | low | footer |
| `/safety` | Guest safety overview | N | N | — | Canon | low | footer |
| `/safety-protocol` | Safety protocol (legal) | N | N | — | Canon | low | footer |
| `/community-rules` | Community rules | N | N | — | Canon | low | footer |
| `/campground-safety` | Campground safety overview | N | N | — | Canon | low | footer |
| `/campground-partner-terms` | Owner partner terms | N | N | — | Canon | low | footer |
| `/law-enforcement` | Law-enforcement policy | N | N | — | Canon | low | footer |
| `/data-breach-policy` | Data-breach policy | N | N | — | Canon | low | footer |
| `/privacy` | Privacy policy | N | N | — | Canon | low | footer |
| `/terms` | Terms of service | N | N | — | Canon | low | footer |
| `/account-deletion` | Public "how to delete" info | N | N | — | Canon | low | → `/account/delete` |
| `/goodbye` | Post-deletion confirmation | N | N | — | Canon | low | noindex |
| `/suspended` | Suspended-account landing | N | N | — | Canon | low | reached from auth gates |
| `/consent` | Post-OAuth legal acks ("one last step") | partial | N | `?next` | Canon | med | first-time OAuth users; uses `next=` |

> No dedicated `/pricing` page — pricing is inline on `/owners` + `/owners/start`.

---

## 2. Demo routes

| Route | Purpose | Login | Admin | Params | Canon/Legacy | Risk | Notes |
|---|---|---|---|---|---|---|---|
| `/demo-center` | Demo hub (owner-facing) | N | N | — | Canon | low | trial CTAs → `/owners/start`; Riley hidden |
| `/demo-center/camper` | Camper experience demo | N | N | — | Canon | low | trial CTA → `/owners/start` |
| `/demo-center/owner` | Owner dashboard demo | N | N | — | Canon | low | trial CTA → `/owners/start` |
| `/demo-center/walkthrough` | Guided walkthrough | N | N | — | Canon | low | "See the real thing" → `/owners/start` |
| `/demo` | Legacy Pages-Router interactive demo | N | N | — | Canon (older) | low | linked from `/`, `/owners` |
| `/demo/[campground]` | Saved / branded per-campground demo | N | N | `[campground]` | Canon | low | AgeGate + "Demo Mode" banner; demo-gated |

---

## 3. Camper routes

Everything under the `(app)` group requires camper login (gate in `(app)/layout.tsx`: login → email-confirmed → not suspended → legal acks). The QR hub and a few public surfaces sit outside the group.

| Route | Purpose | Login | Admin | Params | Canon/Legacy | Risk | Notes |
|---|---|---|---|---|---|---|---|
| `/campground/[slug]` | **Unified guest hub / QR landing** | N* | N | `[slug]`, `?token` | Canon | **high** | Core camper surface. *Anon sees park info; authed sees Camper Connections layer. 404 on invalid slug |
| `/campground/[slug]/updates` | Old updates page | — | — | `[slug]` | Legacy redirect | low | 307 → `/campground/[slug]` |
| `/quickcheckin` | Public no-signup check-in (allow-listed demo slugs) | N | N | `?slug&token` | Canon | med | provisions throwaway auth user → `/home` |
| `/m/[id]` | Token-gated guest↔office reply thread | N (token) | N | `[id]`, `?t&from` | Canon | med | noindex; site#+last-name gated |
| `/home` | Signed-in camper home | Y | N | — | Canon | low | tiles → waves / past-waves / etc. |
| `/checkin` | Check-in / no-context fallback | Y | N | `?token` | Canon | med | graceful when no campground context |
| `/nearby` | Slug-resolver → active campground connections | Y | N | — | **Legacy redirect (kept)** | low | 307 → `/campground/<slug>#camper-connections` or `/checkin` |
| `/crossed-paths` | **Past Waves** list (connections) | Y | N | — | **Canon** (UI label = "Past Waves") | med | URL name ≠ UI label |
| `/crossed-paths/[id]` | Past Waves conversation thread (camper-to-camper messaging) | Y | N | `[id]` | Canon | med | — |
| `/past-waves` | Friendly alias | — | — | — | Alias (new) | low | 307 → `/crossed-paths` |
| `/waves` | Waves (incoming + sent) | Y | N | — | Canon | low | → `/waves/incoming/[id]` |
| `/waves/incoming/[id]` | Single incoming wave (Wave Back / Ignore) | Y | N | `[id]` | Canon | low | — |
| `/meetups` | Campground meetups (camper view) | Y | N | — | Canon | low | — |
| `/bulletins` | Campground bulletins (camper view) | Y | N | — | Canon | low | — |
| `/profile` | Camper profile | Y | N | — | Canon | low | edit → `/profile/setup` |
| `/profile/setup` | Profile onboarding | Y | N | — | Canon | low | — |
| `/settings/privacy` | Visibility / privacy controls | Y | N | — | Canon | low | — |
| `/account/delete` | **Canonical** account deletion | Y | N | — | Canon | med | destructive (self-serve) |
| `/settings/delete-account` | Old deletion URL | — | — | — | Legacy redirect | low | 308 → `/account/delete` |

**Lantern / notifications:** the bell is a component (`AppLantern` + `notifications/actions.ts`), not a route. Requires camper login.

---

## 4. Owner routes

| Route | Purpose | Login | Admin | Params | Canon/Legacy | Risk | Notes |
|---|---|---|---|---|---|---|---|
| `/owner` | Router (→ dashboard / setup / login) | Y | N | — | Canon | low | redirect logic only |
| `/owner/login` | Owner login | N | N | — | Canon | med | "Set up" link → `/owners/start` |
| `/owner/signup` | **Old funnel → redirect** | — | — | — | **Legacy (fallback kept)** | low | 308 → `/owners/start`. Old form/actions still in tree but **unreferenced** |
| `/owner/setup` | Campground setup wizard | Y | N | — | Canon | med | → `/owner/dashboard` |
| `/owner/preview` | "What guests see" preview | Y | N | — | Canon | low | auth inlined (outside authed layout) |
| `/owner/print/front-desk-card` | Printable QR card | Y | N | — | Canon | low | — |
| `/owner/dashboard` | Owner dashboard | Y | N | — | Canon | low | trial banner, stats, quick actions |
| `/owner/messages` | Office messages inbox | Y | N | — | Canon | low | — |
| `/owner/bulletin` | Post / manage bulletins | Y | N | — | Canon | low | — |
| `/owner/meetups` | Post / manage meetups | Y | N | — | Canon | low | — |
| `/owner/marketing` | Reviews / rebooking + Weather & Safety notices | Y | N | — | Canon | low | — |
| `/owner/qr` | QR materials / tokens | Y | N | — | Canon | low | — |
| `/owner/analytics` | Engagement analytics | Y | N | — | Canon | low | — |
| `/owner/billing` | Billing / subscription | Y | N | — | Canon | **high** | → Stripe customer portal |

**Campground switching:** handled implicitly by `/owner` routing via the `campground_admins` table. There is **no dedicated campground-switcher route** — multi-campground owners currently land on their first linked campground.

---

## 5. Admin routes

All require admin (`requireAdmin()` in `admin/layout.tsx`).

| Route | Purpose | Login | Admin | Risk | Notes |
|---|---|---|---|---|---|
| `/admin` | Redirect → `/admin/activity` | Y | **Y** | low | no standalone dashboard |
| `/admin/activity` | Activity feed (de-facto admin home) | Y | Y | low | — |
| `/admin/campgrounds` | Campground list + trial management | Y | Y | med | extend-trial actions |
| `/admin/users` | User management | Y | Y | med | — |
| `/admin/inbox` | Owner-signup submissions | Y | Y | med | reads `owner_signup_submissions` |
| `/admin/qr` | QR token admin | Y | Y | low | — |
| `/admin/safety` | Safety reports / moderation | Y | Y | med | — |
| `/admin/health` | System health page | Y | Y | low | pairs with `/api/admin/health` |

---

## 6. Auth routes

| Route | Purpose | Login | Admin | Canon/Legacy | Risk | Notes |
|---|---|---|---|---|---|---|
| `/login` | Camper email + password login | N | N | Canon | med | `(auth)` group; threads `?next` |
| `/signup` | Camper signup | N | N | Canon | med | — |
| `/verify` | Email-confirmation gate | N | N | Canon | low | `?next` |
| `/forgot-password` | Request password reset | N | N | Canon | low | — |
| `/auth/reset-password` | Set new password (from email link) | N | N | Canon | low | — |
| `/auth/sign-in` | **Magic-link / OTP confirmation page** | N | N | Canon (distinct) | **high** | Scanner-resistant landing the **Stripe owner onboarding depends on**. NOT a duplicate of `/login` — do not consolidate |
| `/auth/callback` | OAuth (Google) callback (route handler) | N | N | Canon | med | → `/consent` or `next` |
| `/auth/confirm` | Email-confirmation callback (route handler) | N | N | Canon | low | honors `next` |
| `/auth/sign-out` | Sign-out (route handler, 303) | N | N | Canon | low | `?next` |

---

## 7. API / server routes

| Route | Purpose | Login | Admin | Risk | Notes / exposure |
|---|---|---|---|---|---|
| `/api/stripe/checkout` | Create Checkout session | N | N | **high** | needs `submission_id`; billing |
| `/api/stripe/webhook` | Stripe events → owner provisioning | N | N | **high** | signature-gated |
| `/api/stripe/portal` | Customer portal link | Y | N | high | verify owner-scoped |
| `/api/campground/event` | Guest-hub event logging | N | N | low | — |
| `/api/campground/message` | Guest → office message | N | N | med | verify rate-limit / abuse |
| `/api/campground/[slug]/dynamic` | Per-campground dynamic data | N | N | low | `[slug]` |
| `/api/campground-request` | Owner request intake | N | N | med | spam target — verify rate-limit |
| `/api/campground-lead` | Owner lead intake | N | N | med | spam target — verify rate-limit |
| `/api/owner-auth` | Owner auth helper | Y | N | med | verify owner-gated |
| `/api/owner/message-counts` | Unread badge counts | Y | N | low | verify owner-gated |
| `/api/owner/signup-logo` | Logo upload at signup | N | N | med | verify size/type limits |
| `/api/support-chat` | Riley support chat (LLM) | ? | N | **med-high** | **LLM cost** — verify gating / rate-limit |
| `/api/support-chat/report` | Report a Riley chat | ? | N | low | — |
| `/api/speak` | TTS (Riley voice) | ? | N | **med** | **cost** — verify gating / rate-limit |
| `/api/demo` | Demo builder | N | N | med | — |
| `/api/demo/email` | Branded-demo email | N | N | med | email send — verify rate-limit |
| `/api/admin/health` | Health JSON | Y | **Y** | low | admin-gated ✓ |
| `/api/email/test` | Resend deliverability smoke test | Y | **Y** | low | **admin-gated ✓** (verified) |
| `/api/cron/expire-checkins` | Cron: expire stale check-ins | — | — | **med** | **verify CRON secret / Vercel-cron gating** |
| `/api/cron/owner-weekly-report` | Cron: Monday owner summary email | — | — | **med** | **verify CRON secret** |
| `/api/cron/trial-expiring` | Cron: trial-expiring emails | — | — | **med** | **verify CRON secret** |

**Server actions** (form handlers, behave like backend endpoints; ~28 `actions.ts` files): camper (checkin, quickcheckin, waves, crossed-paths, meetups, notifications, report, profile/setup, settings/privacy, delete-account), owner (login, signup [unused], setup, qr, messages, bulletin, profile, owners/start, owners/success), admin (campgrounds, inbox, safety), auth (login, signup, verify, sign-in), consent.

---

## 8. Redirects & aliases

| From | To | Code | Type |
|---|---|---|---|
| `/owner/signup` | `/owners/start` | 308 | legacy → canonical |
| `/owners/signup` | `/owners/start` | 308 | legacy |
| `/start` | `/owners/start` | 308 | legacy |
| `/campgrounds` | `/owners` | 308 | legacy |
| `/past-waves` | `/crossed-paths` | 307 | new alias |
| `/nearby` | active campground hub `#camper-connections` (or `/checkin`) | 307 | kept resolver |
| `/campground/[slug]/updates` | `/campground/[slug]` | 307 | legacy |
| `/settings/delete-account` | `/account/delete` | 308 | legacy |
| `/auth/sign-in` | *(no redirect — distinct magic-link page)* | — | — |

---

## 9. Deprecated / legacy routes (kept for safety)

- **Redirect stubs:** `/owner/signup`, `/owners/signup`, `/start`, `/campgrounds`, `/campground/[slug]/updates`, `/settings/delete-account`, `/past-waves`.
- **Functional-but-retired:** `/nearby` (still used as the nav fallback + by `revalidatePath('/nearby')` and a few `href="/nearby"` links).
- **Dead code behind a redirect:** `src/components/owner/owner-signup-form.tsx` + `src/app/owner/signup/actions.ts` (unreferenced after `/owner/signup` became a redirect).

---

## 10. Risk notes

### Routes that touch Stripe / billing / live data
`/owners/start`, `/owners/success`, `/start/welcome`, `/owner/billing`, `/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/portal`, `/admin/inbox`, `/admin/campgrounds` (trial extend). **Handle with extra care; never run a real checkout casually.**

### Routes that depend on campground context (break / fall back if missing)
- `/campground/[slug]` → 404 on invalid slug.
- `/quickcheckin` → 404 without a valid `slug`+`token`.
- `/checkin` → no-context fallback when no token (handled).
- `/nearby` → `/checkin` when no active check-in (handled).
- Camper nav "Camper Connections" `connectionsHref` resolves the active check-in in `(app)/layout.tsx`; **falls back to `/checkin`** when none.

### Routes that depend on auth returnTo / `next` behavior
- `/login`, `/signup`, `/verify`, `/consent` thread `?next`.
- `(app)/layout.tsx` builds `?next` from the `x-pathname` header (set by middleware) so a signed-out camper deep-linking to `/waves`, `/crossed-paths`, etc. returns to the intended page after login.
- `/auth/sign-in` carries its own `next` (owner magic-link onboarding).
- QR → login → hub path relies on the `pending_checkin_token` cookie + `next`.

### Should-not-be-public / verify gating
- Confirmed gated: `/admin/*`, `/api/admin/health`, `/api/email/test`.
- **To verify:** `/api/cron/*` (cron secret), `/api/speak` + `/api/support-chat` (LLM/TTS cost, rate-limits), lead/message intake endpoints (spam).

### Naming / confusion risks
- `/crossed-paths` URL vs "Past Waves" UI label (mitigated by `/past-waves` alias).
- `/start/welcome` vs `/owners/success` (two activation pages).
- `/owner/login` vs `/owner/signup` (now a redirect).
- No campground-switcher UI for multi-campground owners.

---

*See `docs/ROADWAVE_MANUAL_QA_CHECKLIST.md` for the manual test flows and the "remove later" list.*

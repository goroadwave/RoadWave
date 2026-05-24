# Campground tenancy QA checklist

Static tests (`tests/qa/tenancy-schema.test.js` and
`tests/qa/tenancy-queries.test.js`) lock the schema and
query-pattern invariants and run in every environment. This
checklist covers the live-app cases that need authenticated
sessions and visible UI verification.

Run before any release that touches owner-side data flows
(messages, bulletins, meetups, profile, QR) or the camper-side
Past Waves / Waves / Camper Connections surfaces.

Two owner accounts and at least two camper accounts are required;
re-use the existing demo + a second owner you control. **Do not
write to production via these tests — operate in a preview env
or against your own production owner accounts.**

---

## 1. Campground data ownership

For campground A:

- [ ] Owner sets logo, address, phone, Wi-Fi info, park map URL,
      amenities checklist, rules text, check-in/check-out times,
      review link, rebooking link via `/owner/profile`,
      `/owner/marketing`, `/owner/qr`.
- [ ] Owner posts a bulletin via `/owner/bulletin`.
- [ ] Owner posts a meetup via `/owner/meetups`.
- [ ] A guest sends a Contact the Office message from the QR
      page (`/campground/<slug>`).
- [ ] Hard-refresh each owner page. Every saved value is still
      there.
- [ ] Sign out, sign back in. Every saved value is still there.
- [ ] On the QR page `/campground/<slug>`, every public-facing
      surface (logo, name, address, map, Wi-Fi, rules, amenities,
      bulletins, meetups) shows campground A's data, never a
      blank or demo value.

## 2. Owner messages retention

- [ ] Guest sends a Contact the Office message from campground
      A's QR page.
- [ ] Owner visits `/owner/messages` → message appears under
      **New** (or **Active**).
- [ ] Mark resolved → message appears under **Resolved** AND
      under **All**.
- [ ] Archive → message appears under **Archived** AND under
      **All**.
- [ ] Hard-refresh `/owner/messages` after each transition. The
      message persists at every step. Counts on each tab match.
- [ ] Owner replies to the message → reply persists; both sides
      of the thread remain visible.
- [ ] At no point does archiving or resolving delete the row.

## 3. Multi-campground separation

Requires two campgrounds A and B you control.

- [ ] Sign in as owner of A. Add a unique bulletin
      ("A-bulletin-2026-05-24"), unique meetup ("A-meetup-…"),
      unique Wi-Fi SSID ("A-wifi-…").
- [ ] Sign in as owner of B. Add a unique bulletin
      ("B-bulletin-2026-05-24"), unique meetup, unique Wi-Fi SSID.
- [ ] On `/owner/bulletin` as A: B's bulletin is NOT listed.
- [ ] On `/owner/meetups` as A: B's meetup is NOT listed.
- [ ] On `/owner/messages` as A: only A's messages visible.
- [ ] On the QR page `/campground/<A-slug>`: only A's
      bulletins/meetups/Wi-Fi appear. Same check on
      `/campground/<B-slug>`.
- [ ] In Supabase Studio, run
      `select campground_id, count(*) from bulletins group by 1;`
      and confirm A's and B's counts match what the UI shows.

## 4. Slug / name changes

- [ ] As owner of A, change the campground name and slug via
      `/owner/profile`.
- [ ] All existing bulletins, meetups, messages (active +
      resolved + archived), Wi-Fi info, map, amenities, QR
      settings still appear under the new name. Nothing is lost.
- [ ] Old slug URL `/campground/<old-slug>` either redirects to
      the new slug or 404s; it does NOT show stale data.
- [ ] New slug URL `/campground/<new-slug>` shows the full
      campground state.
- [ ] In Supabase Studio: `select campground_id, count(*) from
      bulletins where campground_id = '<A-id>';` count is
      unchanged after the rename.

## 5. Owner / staff permissions

- [ ] Owner of A signs in → can read + write A's data.
- [ ] A camper account (no `campground_admins` row) signs in and
      navigates directly to `/owner/dashboard` → redirected away
      from owner surfaces; no leaked data.
- [ ] If staff support is enabled: add a second user as
      `host`-role member of A's `campground_admins`. Confirm
      that user can read A's owner pages. Remove the row;
      confirm access is denied immediately on next request, AND
      that A's data itself is untouched.

## 6. Camper account retention

- [ ] As camper RoadMark: complete profile (display name,
      interests, visibility, rig type) via `/profile/setup`.
- [ ] Wave at another camper at campground A. They wave back —
      mutual wave.
- [ ] Send a static-template message in the conversation.
- [ ] Sign out and sign back in. The profile, the mutual wave,
      the message thread are all still there at `/profile`,
      `/crossed-paths`, and `/crossed-paths/<id>` respectively.
- [ ] Check out of campground A (let the check_in expire, or
      navigate to a different campground). The Past Waves entry
      and the message thread remain accessible — both
      conversation pages render without requiring an active
      check-in at the original campground.
- [ ] `/profile` still shows the camper's RoadWave Stops
      history including A.

## 7. Archive / resolve / dismiss / hide semantics

These four actions are distinct. Confirm each:

- [ ] **Archive** (owner messages) → row stays in DB, leaves
      Active view, appears under Archived + All.
- [ ] **Resolve** (owner messages) → row stays in DB, marked
      handled, appears under Resolved + All.
- [ ] **Dismiss** (camper meetup `/meetups`) → camper sees a
      "Clear" button. Tap clears the meetup from that camper's
      list. Other campers still see it. Owner dashboard
      unchanged.
- [ ] **Hide** (camper notification toast) → tap X on a popup,
      it goes away; the Lantern record stays; the AppNav badge
      keeps counting until the camper explicitly marks read.
- [ ] **Delete** (owner deletes a bulletin / meetup) →
      destructive, requires confirmation, removes the row
      globally for everyone.

## 8. No demo fallback protection

- [ ] Sign in as a brand-new user with no `campground_admins`
      row (e.g. a freshly minted email signup that hasn't gone
      through owner setup) and visit `/owner/dashboard` →
      explicit "No campground linked" / "We couldn't find the
      campground connected to this owner account" surface, NOT
      a render of the demo campground's data.
- [ ] Sign in as an owner whose campground was just renamed (so
      the slug changed but the membership row still points at
      the same campground_id) → owner pages render the correct
      data, no fallback message.
- [ ] In `_helpers.ts` confirm `loadOwnerCampground()` returns
      `{ campground: null, ... }` when there's no membership row
      (already covered by `tenancy-queries.test.js` but worth a
      visual confirmation when adjusting auth flows).

---

## How to run the static tests

```bash
npx playwright test tests/qa/tenancy-schema.test.js tests/qa/tenancy-queries.test.js
```

Schema tests read `supabase/migrations/*.sql`. Query-pattern tests
read `src/app/owner/(authed)/**`. No network, no auth, no Supabase
keys needed — they run anywhere the repo is checked out.

When a test fails, the failure name + file paths in the error
message point directly at the regressed file or table. Add the new
table to the appropriate constant list in the test file when
shipping new tenant-owned tables.

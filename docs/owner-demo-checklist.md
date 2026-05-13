# RoadWave campground owner demo — manual checklist

Use this **before, during, and after** a live demo. The companion
`docs/owner-demo-script.md` covers what to say; this one covers what
to verify so nothing breaks in front of a prospect.

---

## T-30 minutes: pre-flight (run in your own browser, not the
## prospect's)

### Production is green

- [ ] Open https://www.getroadwave.com — home page renders, no
      error banner
- [ ] Open https://github.com/goroadwave/RoadWave/actions/workflows/e2e-smoke.yml
      — latest run is green (most recent push OR most recent scheduled
      run at 07:17 UTC). If RED, **stop and diagnose** before the
      demo. The most common red cause is a regression you just
      shipped — check git log against the run.

### Demo campground is fresh + healthy

- [ ] Open https://www.getroadwave.com/campground/roadwave-demo-campground
      → welcome page renders with the seeded campground name, two
      CTAs, an active bulletin or meetup card
- [ ] Open https://www.getroadwave.com/campground/roadwave-demo-campground/updates
      → at least one bulletin + one meetup visible
- [ ] If the demo state is stale or has weird leftover camper data
      from earlier testing, run:
      ```bash
      node scripts/reset-demo-campground.mjs --apply
      node scripts/seed-demo-campground.mjs --apply
      ```
      Then re-check the two URLs above.

### Your real owner campground (Final Stripe Test Campground) is ready

- [ ] Open https://www.getroadwave.com/owner/login on your laptop
- [ ] Enter `markhalesmith@gmail.com` → request magic link
- [ ] Click the magic link from your email — land on `/owner/dashboard`
- [ ] Open `/owner/qr` in another tab — QR renders, Copy Link works,
      Download QR Code works
- [ ] Post one fresh bulletin and one fresh meetup with a today/
      tomorrow date so the prospect sees current content. Use copy
      like: **"Coffee meetup tomorrow at 9 AM near the clubhouse"** and
      **"Sunset walk tonight at 6:30 PM — flagpole."**

### Your demo phone is ready

- [ ] Connect your phone to the demo Wi-Fi (or trust LTE)
- [ ] Open `https://www.getroadwave.com/campground/roadwave-demo-campground`
      in incognito Safari (iPhone) or incognito Chrome (Android) to
      pre-warm the connection — but don't actually check in here
      yet. You'll do that live during the demo.
- [ ] Confirm zoom level + brightness on your phone are appropriate
      for the demo space

### Your slides / browser are ready (optional)

- [ ] Tabs in suggested order: `/owners`, `/owners/how-it-works`,
      `/owner/dashboard`, `/owner/qr`, `/owner/bulletin`, `/owner/meetups`
- [ ] Phone unlocked, RoadWave QR scanner ready

---

## During the demo: sanity checks

Run **only if something feels off**. Most demos won't need any of
these — but it's useful to know how to recover.

### "The QR isn't scanning"

- [ ] Make sure the prospect is using the **default camera app**
      (not Snapchat / Instagram camera, which sometimes don't decode
      QR codes)
- [ ] Make sure your phone screen brightness is at least 60% — dim
      screens kill QR detection
- [ ] As a fallback, share the URL directly via text/AirDrop:
      `https://www.getroadwave.com/campground/roadwave-demo-campground`
- [ ] If `/owner/qr` shows "Your QR code isn't set up yet", tap
      **Generate QR Code** — takes 1-2 seconds

### "The check-in is stuck on 'Checking you in…'"

- [ ] Wait 10 seconds. The action creates an auth user + writes a
      check_in + several DB rows. ~5-8 seconds is normal.
- [ ] If it's still stuck past 15 seconds, refresh and try again.
- [ ] If it consistently fails, **abort the live check-in** and
      switch to: "Let me show you what the camper home looks like
      after check-in" — pre-checked-in on your phone before the demo.

### "I'm seeing the wrong campground in the welcome page"

You're on the prospect's campground page, not the demo. If you're
demoing a prospect's space and they haven't been set up yet, **stay
on the demo campground** (`roadwave-demo-campground`) for the live
walkthrough. Use the prospect's name verbally — "imagine this says
[their campground name] right here."

### "The owner dashboard says 'No campground linked'"

- [ ] You're signed in as the wrong account. Sign out (`Sign out`
      link in header) and sign back in with the correct owner email.
- [ ] If the right account still shows "No campground linked",
      something's wrong with your `campground_admins` row. Don't
      try to fix this live. Show them the demo campground's
      dashboard instead via `/admin` (admin login).

---

## Owner dashboard / activity sanity (after a live check-in during
## the demo)

If you successfully check in your phone live during the demo, the
prospect will want to see the owner side react. Walk:

- [ ] Switch to your laptop tab on `/owner/dashboard`. Click the
      Refresh page button (or pull-to-refresh). **"Active check-ins"**
      should go from N → N+1.
- [ ] If you have a `/owner/analytics` tab, the **QR scans this
      week** count should also have ticked up.
- [ ] **DO NOT** open `/admin` in front of the prospect unless they
      explicitly ask for the founder/admin view. The admin dashboard
      shows cross-campground data that isn't theirs.

---

## After the demo

### Same day

- [ ] Send the follow-up email (per `owner-demo-script.md` — script
      is in the "Post-demo follow-up" section)
- [ ] Log the conversation: campground name + size (sites) + peak
      season + decision-maker + sticking points + next-contact date
- [ ] If they signed up: confirm the welcome email arrived. They
      should have a Stripe receipt + a "Your Campground Kit is
      Ready" email with the QR PDF attached. If both didn't arrive,
      check Resend dashboard + Stripe webhook logs.

### Within a week

- [ ] If they signed up: text/email them on day 3 — "How's it going?
      Any guests scanned yet?"
- [ ] If they didn't sign up: send the lightweight reminder per the
      script. **Do not** send more than one follow-up unless they
      respond.

### Clean up demo state (optional, only if you're demoing again
### soon to a different prospect)

- [ ] Run `node scripts/reset-demo-campground.mjs --apply` to clear
      the camper check-ins from this demo
- [ ] Re-run `node scripts/seed-demo-campground.mjs --apply` to
      reset to a clean known state
- [ ] Or use the admin UI: `/admin/campgrounds` → "Reset Demo
      Campground" button (top of page) → confirm

---

## Decision points — when to walk away

If during the demo any of these happens, **politely close the demo
and reschedule**. Do not push through a broken experience.

1. **Production is down or 5xx-ing on any flow you'd show.** Better
   to admit it and reschedule than to demo a broken version of your
   own product.
2. **Migration drift** — e.g., the prospect's Supabase project hasn't
   gotten a recent migration and something errors. **You should never
   demo against an unmigrated environment.** Always demo against
   production.
3. **Network/Wi-Fi blocks the QR flow.** If their property has
   captive-portal Wi-Fi that breaks the redirect chain, switch to
   "let me share my phone hotspot" or reschedule.
4. **A prospect raises a real product objection you can't answer.**
   It's better to say "let me find out and get back to you tomorrow"
   than to bullshit on the spot.

---

## What "safe to demo" actually means

You're safe to demo when:

- Latest commit on `main` has built successfully (Vercel green)
- The `e2e-smoke` GitHub Actions run for that commit was green
- Your laptop can reach `/owner/dashboard` and post a bulletin in
  under 30 seconds
- Your phone can complete a QR check-in and land on `/home` with
  the "Checked in at" chip visible in under 15 seconds

If any of those four don't hold, fix or reschedule.

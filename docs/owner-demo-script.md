# RoadWave campground owner demo — script

What to say when walking a campground owner through RoadWave for the
first time. Sized for ~10 minutes face-to-face or 15 minutes on a
screen-share. Pair with `docs/owner-demo-checklist.md` for the
pre-flight + sanity checks.

---

## The 30-second pitch

> "RoadWave is a QR-code guest engagement hub for campgrounds. Your
> guests scan a QR at your front desk, they land on a private welcome
> page branded for your campground, and from there they can leave you
> a Google review, book their next stay, see your bulletins and
> meetups, send you a private message — and optionally connect with
> other campers who share their interests. You see engagement counts
> on a dashboard, plus a weekly summary email. No app store, no
> public chat, no exact site numbers. Twenty dollars a month, two
> minutes to set up."

If they nod, go to the live demo. If they want detail, go to the
walkthrough.

---

## 5-minute walkthrough — what to say at each step

### Step 1 (30s) — Land them on `/owners`

> "This is the marketing page — what a campground owner sees when
> they hear about us. The pitch in one screen."

Scroll quickly past the value props. Don't dwell — the prospect
already half-believes the pitch or they wouldn't be here.

### Step 2 (60s) — Show them `/owners/how-it-works`

> "Before we sign anything, here's exactly what your guests will see
> from QR scan to checked-in. Eight steps. Every one is opt-in."

Click through the eight steps quickly. Hover on the **privacy notes**
in the leaf-green text under each step — that's the selling point.
Read one or two aloud:

> "No exact site number is ever captured. No always-on GPS."

End with "What RoadWave is NOT" — five quick bullets. Read the
"Just a guest app" / "Public group chat" / "Surveillance tool" lines.
This handles the objections that haven't come up yet.

### Step 3 (60s) — Open `/demo` on your phone

> "This is exactly what your guests would see — Riverbend RV Park,
> our sample campground."

Hold the phone so they can see it. Tap through:
- Welcome page (point to the campground name, the two CTAs)
- "Just See Campground Updates" — show the bulletin + meetup
  rendering on the read-only page

> "A guest who doesn't want to make an account can still see your
> updates. They tap one button and they're in your bulletin board."

Go back. Tap "Check In to This Campground" → show the form:

> "Visibility — Visible, Quiet, or Invisible. Interests — Coffee, Dog
> walk, Campfire, Pickleball. One tap. Done."

### Step 4 (90s) — The check-in lands; show the camper home

Complete the check-in on your phone. Scroll their home:

> "They're checked in for 24 hours. Your bulletin is right there.
> Your meetup is right there. The 'Where the action is' tiles let
> them find shared-interest campers if they want — or skip it
> entirely."

If they ask about the campers tab: tap into `/nearby`, show the
demo campers with interests.

> "They can send a wave. The other person has to wave back before
> anyone sees anything else. No public chat. No way to spam."

### Step 5 (90s) — Switch to your laptop, open `/owner/dashboard`

> "This is what you see. Active check-ins right now: [N]. Visibility
> breakdown — Visible / Quiet / Invisible / Updates Only. QR scans
> this week. Review clicks. Book-again clicks. Contact-office
> messages. Bulletin views."

Point to specific cards. Don't read every number.

> "What you don't see: exact site numbers, real names, who waved at
> who, anything you'd be uncomfortable having in your hands."

Open `/owner/qr`:

> "Your QR code. Three print sizes — 8.5×11 for a poster, 5×7 for a
> standing card, 4×6 for the front-desk counter. Each one has your
> campground name, the QR, the brand, and the safety line. Print it,
> post it, you're live."

### Step 6 (30s) — `/owner/bulletin` — post something while they watch

Type: **"Coffee meetup tomorrow at 9 AM near the clubhouse"** → Save.

Switch to your phone (refresh the camper view).

> "Three seconds later, every guest checked into your campground
> sees this on their home screen. No notification spam — they see it
> when they next open the app."

### Step 7 (30s) — Pricing + setup

> "$20/month per campground. 14-day free trial — $0 due today. Sign
> up via Stripe, get an email with your QR PDF attached, print, post,
> done. Total setup time: two minutes."

> "Cancel anytime from the billing tab. No contract. We don't sell
> your guest data. You can export your dashboard data anytime."

### Step 8 (30s) — Ask for the close

> "Want to try a free pilot at [their campground name]? I can have
> you set up in two minutes if you're game."

If yes → `/owners/start`. If they want time to think, send them the
`/owners/how-it-works` URL and your email.

---

## Common questions + suggested answers

### "How do you make money?"

> "Subscriptions only. $20/month per campground. We don't take a cut
> of bookings, we don't sell guest data, we don't run ads. We make
> money when campgrounds choose to keep paying us."

### "What about Wi-Fi? My guests have bad cell service."

> "RoadWave is a web page, not an app — it works over your campground
> Wi-Fi or LTE. If your Wi-Fi is solid enough that guests can stream
> Netflix in their rigs, RoadWave will be fine."

### "Will I have to moderate a chat?"

> "Nope. There is no public chat. The only messages between guests
> happen privately, and only after both people waved at each other —
> mutual consent. The Contact-Office messages go to your inbox, you
> reply when you want. No moderation queue."

### "What if a guest is creepy?"

> "Every camper has a Report button on every other camper. Reports
> land in our admin inbox — we review and can suspend an account
> within minutes. We've already built the moderation tooling. You
> never have to be in the middle of a guest dispute."

### "Can I see exactly who's at my campground?"

> "No. By design. You see counts and engagement stats. Guest names,
> contact info, and site numbers stay private. If you want to know
> who is at site B-42 right now, that's your reservation system, not
> RoadWave."

### "What if I want to message all my guests?"

> "Post a bulletin. Every checked-in guest sees it on their home
> screen. It's a one-to-many push without being a notification."

### "Can I customize the welcome page?"

> "Yes — your campground name, logo, city, amenities, Google review
> URL, booking URL with a promo code, and a custom welcome message.
> You toggle each engagement feature on or off independently."

### "What happens when my trial ends?"

> "On day 14, Stripe charges $20 and you keep going. If you cancel
> before day 14, no charge. If you cancel later, the QR keeps working
> until the end of the period you paid for, then it deactivates."

### "Do you have iOS / Android push notifications?"

> "Today, in-app notifications work on every device — your guests
> see a notification icon when they open RoadWave. Phone-level push
> notifications are on our roadmap and require the guest to add the
> page to their Home Screen on iPhone (Apple's rule, not ours).
> Honest answer: today, this works as a web page, not a push-app."

### "What if I'm not technical?"

> "That's the test. If you can scan a QR with your phone camera and
> click a button, you can set up RoadWave. The hardest thing you'll
> do is print the QR card and tape it to your front desk."

---

## Post-demo follow-up

If they signed up → send them:
1. A "thanks + your QR is ready" message linking to `/owner/qr`
2. The `/owners/how-it-works` URL as a reference
3. Your direct email for "first 30 days white-glove support"

If they didn't sign up → send them:
1. The `/owners/how-it-works` URL
2. The `/demo` URL on their phone (text or email)
3. A short "no rush — here's the link if you change your mind" note
   with a 30-day expiry on whatever discount you offered

Either way, log the conversation in your CRM with: campground name,
size (sites), peak season, decision-maker name, sticking points if
any, next contact date.

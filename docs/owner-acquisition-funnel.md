# RoadWave — Owner Acquisition Funnel

> **Goal:** turn RoadWave into a self-serve marketing funnel where campground owners can discover us through search, understand the product quickly, view the live demo, and start a free 30-day pilot without manual outreach.
> **Status:** Phase 2 shipped.

---

## Phase 1 (already shipped)

- `/` (camper-focused hero with a soft owner pathway aside that links to `/owners`).
- `/owners` (the canonical owner marketing/explainer page).
- `/owners/how-it-works` (step-by-step owner walkthrough).
- `/owners/start` (Stripe-gated trial intake — the canonical "Start Free 30-Day Trial" destination).
- `/demo-center` (the polished sales hub) + `/demo` (interactive sample) + `/demo/[campground]` (branded preview).
- First SEO comparison page: **`/app-my-community-alternative`** (Phase 1 SEO entry — already submitted to Google Search Console, FAQ structured data detected).
- Public `/sitemap.xml` (Next.js Metadata API at `src/app/sitemap.ts`).

---

## Phase 2 (this delivery)

### New SEO pages

| Route | Purpose | Target themes |
|---|---|---|
| **`/qr-code-app-for-campgrounds`** | Owner-search landing positioning RoadWave as the QR-based guest welcome page / digital welcome packet. | "QR code app for campgrounds", "QR welcome page", "digital welcome packet", "campground Wi-Fi map rules QR", "office messages QR" |
| **`/campground-guest-app`** | Broader category page for "campground guest app" / "RV park guest app" / "campground communication app" searches. | "campground guest app", "RV park guest app", "campground communication app", "campground app for guests" |

Both pages include:
- Real RoadWave components only (Logo, Eyebrow, shared `SiteFooter` from the root layout, the shared `.trial-cta` button, native `<details>` FAQ — no client JS).
- Full metadata (title, description, canonical, Open Graph, Twitter card).
- FAQPage JSON-LD with 5 questions, server-rendered via `dangerouslySetInnerHTML`.
- Honest, non-exaggerated wording — no "guaranteed", no "best campground app", no "replaces every app".

### Internal linking strategy

The three SEO pages cross-link with a small **"Related RoadWave resources"** block above each page's final CTA, so a curious visitor can hop between positioning pages without leaving the funnel:

```
/app-my-community-alternative  →  /qr-code-app-for-campgrounds, /campground-guest-app
/qr-code-app-for-campgrounds   →  /campground-guest-app, /app-my-community-alternative,
                                    /owners, /demo
/campground-guest-app          →  /qr-code-app-for-campgrounds, /app-my-community-alternative,
                                    /owners, /demo
```

`/owners` gained a subtle **"Helpful resources"** mini-section between the pricing block and the final CTA (3 small mist-grey links), so prospects weighing alternatives or researching the category discover the SEO pages from the funnel itself — not loud, not SEO-farm-looking.

### CTA destinations (consistent across all SEO pages)

- **Primary CTA — "Start Free 30-Day Trial"** → `/owners/start` (the canonical Stripe trial intake every CTA on the site already uses).
- **Secondary CTA — "See the Demo" / "Try the Demo"** → `/demo`.

Header cross-nav is the same three-link pattern as `/owners`: **Why RoadWave?** → `/owners`, **Demo** → `/demo`, **Start a Pilot** → `/owners/start`.

### Sitemap

Both new URLs are added to `src/app/sitemap.ts` at priority 0.8, change frequency monthly:

- `https://www.getroadwave.com/qr-code-app-for-campgrounds`
- `https://www.getroadwave.com/campground-guest-app`

The sitemap excludes auth, camper/owner authed surfaces, `/admin`, redirect stubs, API routes, and per-campground guest hubs.

---

## Files changed (Phase 2)

| File | Change |
|---|---|
| `src/app/qr-code-app-for-campgrounds/page.tsx` | **New** SEO page |
| `src/app/campground-guest-app/page.tsx` | **New** SEO page |
| `src/app/sitemap.ts` | Added the two new URLs |
| `src/app/owners/page.tsx` | Replaced the single in-pricing AMC line with a 3-link "Helpful resources" section between the pricing block and the final CTA |
| `src/app/app-my-community-alternative/page.tsx` | Added a "Related RoadWave resources" section before the final CTA linking to the two new SEO pages |
| `docs/owner-acquisition-funnel.md` | **New** — this file |

### Branded social-preview images (follow-up to Phase 2)

Each of the three public SEO landing pages now ships a dynamically generated, on-brand 1200×630 Open Graph / Twitter card image. They use Next.js App Router's `opengraph-image.tsx` and `twitter-image.tsx` file conventions, so Next emits `<meta property="og:image">` and `<meta name="twitter:image">` automatically — no `page.tsx` metadata edits required.

| File | Purpose |
|---|---|
| `src/lib/og/page-og.tsx` | Shared `renderRoadwaveOg({ headline, subtext, eyebrow? })` template (dark-navy bg, amber glow accents, RoadWave wordmark with 👋 _after_ the word, cream headline, mist subtext, amber footer rule). |
| `src/app/app-my-community-alternative/opengraph-image.tsx` + `twitter-image.tsx` | "App My Community Alternative for Campgrounds" / "A simpler QR-powered guest app with a free 30-day pilot." |
| `src/app/qr-code-app-for-campgrounds/opengraph-image.tsx` + `twitter-image.tsx` | "QR Code App for Campgrounds" / "Wi-Fi, maps, updates, office messages, reviews, rebooking, and camper connections." |
| `src/app/campground-guest-app/opengraph-image.tsx` + `twitter-image.tsx` | "Campground Guest App for RV Parks" / "A simple guest communication and camper connection tool — no app download required." |

Each `twitter-image.tsx` is a one-line re-export of the route's `opengraph-image.tsx`, so the artwork stays DRY across the two file conventions. The 👋 emoji renders via Twemoji (`emoji: 'twemoji'` ImageResponse option). After Vercel deploys, the live image URLs are reachable at `https://www.getroadwave.com/<route>/opengraph-image` and `/<route>/twitter-image` for paste-into-debugger verification (Facebook Sharing Debugger, LinkedIn Post Inspector, X Card Validator).

---

## Future SEO page ideas (Phase 3 candidates)

These are deliberate "what would we write next" notes, not commitments. Each would follow the same component pattern (Logo + cross-nav header, hero, themed sections, FAQ with FAQPage JSON-LD, related-resources block, final CTA) and reuse design tokens.

- `/campground-communication-app` — owner search for "campground communication app", "park-to-guest messaging".
- `/rv-park-guest-app` — slightly broader, RV-park-specific variant.
- `/digital-welcome-packet-for-campgrounds` — targets the "digital welcome packet" search intent specifically.
- `/campground-review-and-rebooking-tool` — focused on the Google review + Book Again half of the product.
- `/campersapp-alternative` — second comparison page (mirrors the `/app-my-community-alternative` structure).
- `/campground-app-without-annual-contract` — explicit month-to-month / no-annual-contract positioning.

### Phase 3 considerations
- ~~Add `og:image` to every SEO page~~ — ✅ done for the three Phase 2 SEO pages (see "Branded social-preview images" above). Any future SEO page should add its own `opengraph-image.tsx` + `twitter-image.tsx` using the shared `renderRoadwaveOg()` helper in `src/lib/og/page-og.tsx`.
- After 4–6 SEO pages, consider a small public `/compare` or `/resources` index so the cross-links don't depend only on per-page "Related resources" blocks.
- Track which SEO pages convert to `/owners/start` form starts so we know which themes to expand.

---

## Editorial / legal guardrails

- **Avoid:** "guaranteed more bookings", "guaranteed more reviews", "best campground app", "replaces every campground app", "works for every park".
- **Prefer:** "helps", "can reduce", "designed to", "built for", "gives owners another way to", "makes it easier for guests to".
- Comparison pages must include a small trademark disclaimer for the named competitor (see `/app-my-community-alternative` for the pattern: "Comparison reflects publicly available information about [competitor] as of [month year]. [Competitor] is a trademark of its respective owner; RoadWave is not affiliated with it.")
- The `/owners/start` Stripe funnel is the **only** "Start Free 30-Day Trial" destination across the site. Do not introduce a competing trial route.

---

## Post-deploy checklist (after every new SEO page)

1. ✅ Confirm `https://www.getroadwave.com/<slug>` returns 200.
2. ✅ Confirm `https://www.getroadwave.com/sitemap.xml` includes the new URL.
3. ✅ Run Google's Rich Results Test against the URL → FAQ structured data should be detected.
4. ✅ Submit the new URL in Google Search Console → request indexing.
5. ✅ Spot-check on a real phone (390px mobile viewport) — no horizontal overflow, FAQ accordions tap-expand, CTAs are tappable.
6. ✅ Confirm both CTAs route to `/owners/start` and `/demo` respectively.

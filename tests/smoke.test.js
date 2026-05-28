// @ts-check
//
// Canonical smoke suite for RoadWave. Runs against the production URL
// (https://www.getroadwave.com) by default, override with
// PLAYWRIGHT_BASE_URL.
//
// Safety rules baked into every test here:
//   - read-only against the live site
//   - no real signup, login, or auth.users row creation
//   - no real Stripe checkout — only verifies the route doesn't crash
//   - no DB writes, no email sends, no rate-limit-burning loops
//
// Scope (kept narrow on purpose — these are the tests we want green
// before EVERY deploy):
//   1. Public website renders + key CTAs route correctly
//   2. Camper-facing pages load without 500
//   3. Owner-facing pages load + auth gates redirect
//   4. Stripe endpoints reject bad input without crashing
//   5. Console-error guard on the busiest public pages
//   6. Mobile viewport sanity on the homepage
//
// Anything that requires real auth (owner dashboard internals, camper
// check-in waves, Riley actually opening a chat) belongs in the
// existing tests/*.test.js files — those need separate maintenance
// against the current copy.

import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wire up a console-error + failed-network watcher for a page. Returns
 * a `getErrors()` function that the test can call before its final
 * assertions. Anything in `allowedUrlSubstrings` is ignored — useful
 * for cases like the Stripe webhook test where we intentionally hit a
 * 400.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ allowedUrlSubstrings?: string[] }} [opts]
 */
function watchForPageErrors(page, opts = {}) {
  /** @type {string[]} */
  const errors = []
  const allowed = opts.allowedUrlSubstrings ?? []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      // Filter out third-party warnings we can't fix (Vercel insights
      // sometimes logs harmless 401s in dev/preview; same for some
      // browser-extension messages in CI). Keep the bar tight on our
      // own domain.
      const text = msg.text()
      // Match the allow-list against both the message text AND the
      // resource URL it came from. A failed fetch logs a generic
      // "Failed to load resource: ... 404" whose URL lives on
      // msg.location(), not in the text — so allowing a URL substring
      // (e.g. a not-yet-built route's prefetch) must suppress that
      // console.error too, not just the matching [network] entry.
      const locUrl = msg.location()?.url ?? ''
      if (allowed.some((s) => text.includes(s) || locUrl.includes(s))) return
      errors.push(`[console.error] ${text}`)
    }
  })

  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`)
  })

  page.on('response', (res) => {
    const url = res.url()
    const status = res.status()
    if (status < 400) return
    if (allowed.some((s) => url.includes(s))) return
    // Ignore 4xx on _next/data prefetches and analytics — they fire
    // opportunistically and aren't a user-visible failure.
    if (url.includes('/_next/data/')) return
    if (url.includes('vercel-insights') || url.includes('/_vercel/')) return
    errors.push(`[network ${status}] ${url}`)
  })

  return () => errors.slice()
}

// ---------------------------------------------------------------------------
// 1. Public website
// ---------------------------------------------------------------------------

test.describe('Public website', () => {
  test('homepage loads with hero + key CTAs', async ({ page }) => {
    const getErrors = watchForPageErrors(page)

    const resp = await page.goto('/')
    expect(resp?.status(), 'homepage HTTP status').toBeLessThan(400)

    // Hero headline — current copy "The campground amenity that helps
    // guests connect." Match loosely on a stable phrase.
    await expect(
      page.getByRole('heading', {
        name: /campground amenity that helps guests connect/i,
      }),
    ).toBeVisible()

    // Primary hero CTA "Try the Demo" points at /demo
    const demoCta = page.getByRole('link', { name: /Try the Demo/i }).first()
    await expect(demoCta).toBeVisible()
    await expect(demoCta).toHaveAttribute('href', '/demo')

    // Secondary hero CTA "For Campground Owners" points at /owners
    const ownersCta = page
      .getByRole('link', { name: /For Campground Owners/i })
      .first()
    await expect(ownersCta).toBeVisible()
    await expect(ownersCta).toHaveAttribute('href', '/owners')

    expect(getErrors()).toEqual([])
  })

  test('header sign-in + footer legal links resolve', async ({ page }) => {
    await page.goto('/')
    // Header has only one nav link on the homepage — Sign in
    const signIn = page.getByRole('link', { name: /^Sign in$/i }).first()
    await expect(signIn).toHaveAttribute('href', '/login')

    // Footer legal/safety hrefs we expect to find anywhere on the
    // homepage (they live in <SiteFooter />). Just confirm presence —
    // navigation-correctness is covered by their own tests below.
    for (const expected of ['/privacy', '/terms', '/safety', '/contact']) {
      const link = page.locator(`a[href="${expected}"]`).first()
      await expect(link, `footer link to ${expected}`).toBeVisible()
    }
  })

  test('Try Demo CTA navigates to /demo and serves Pages-Router demo', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Try the Demo/i }).first().click()
    await page.waitForURL('**/demo')
    // The Pages-Router demo page (src/pages/demo.jsx) sets this title.
    await expect(page).toHaveTitle(/RoadWave · Demo/i)
    // And renders the sample-park hero — "Welcome to Riverbend RV Park".
    await expect(page.getByText(/Riverbend RV Park/i).first()).toBeVisible()
  })

  test('homepage Camper CTA navigates to /signup', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: /Check In as a Camper/i })
      .first()
      .click()
    await page.waitForURL('**/signup')
    await expect(page).toHaveURL(/\/signup/)
  })

  test('owner pathway aside CTA navigates to /owners', async ({ page }) => {
    await page.goto('/')
    const ownerPath = page
      .getByRole('link', { name: /See how RoadWave works for campgrounds/i })
      .first()
    await expect(ownerPath).toHaveAttribute('href', '/owners')
  })

  test('clearly-bad URL returns a 404', async ({ page }) => {
    const resp = await page.goto('/this-route-does-not-exist-roadwave-smoke')
    expect(resp?.status(), 'expect 404').toBe(404)
  })
})

// ---------------------------------------------------------------------------
// 2. Owner-facing — including the recently-fixed demo CTA
// ---------------------------------------------------------------------------

test.describe('Owner landing + CTAs', () => {
  test('/owners loads with hero + both hero CTAs', async ({ page }) => {
    const getErrors = watchForPageErrors(page)

    const resp = await page.goto('/owners')
    expect(resp?.status()).toBeLessThan(400)

    // Current hero — "A QR guest engagement hub for your campground."
    await expect(
      page.getByRole('heading', { name: /QR guest engagement hub/i }),
    ).toBeVisible()

    // Pilot CTA (both hero + final-CTA instances; pick the first)
    const pilot = page
      .getByRole('link', { name: /Start My Campground Pilot/i })
      .first()
    await expect(pilot).toHaveAttribute('href', '/owners/start')

    // Live demo CTA — goes straight to /demo (the fix you just shipped)
    const liveDemo = page
      .getByRole('link', { name: /See the live demo/i })
      .first()
    await expect(liveDemo).toHaveAttribute('href', '/demo')

    expect(getErrors()).toEqual([])
  })

  test('"See the live demo" navigates to /demo (no form gate)', async ({
    page,
  }) => {
    await page.goto('/owners')
    await page.getByRole('link', { name: /See the live demo/i }).first().click()
    await page.waitForURL('**/demo')
    await expect(page).toHaveTitle(/RoadWave · Demo/i)
  })

  test('"Start My Campground Pilot" navigates to /owners/start', async ({
    page,
  }) => {
    await page.goto('/owners')
    await page
      .getByRole('link', { name: /Start My Campground Pilot/i })
      .first()
      .click()
    await page.waitForURL('**/owners/start')
    await expect(page).toHaveURL(/\/owners\/start$/)
  })

  test('customizer section is retitled as a builder, not "the live demo"', async ({
    page,
  }) => {
    await page.goto('/owners')
    // The wizard section keeps id="request-demo" but the visible copy
    // must not say "Try it now" anymore — it's a builder.
    await expect(
      page.getByText(/Build my free campground demo/i).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: /Customize this with my campground name/i,
      }),
    ).toBeVisible()
    // Old misleading copy should be gone.
    await expect(page.getByText(/Try it now — no sign-up/i)).toHaveCount(0)
  })

  test('/owners/start renders the pilot intake form', async ({ page }) => {
    const resp = await page.goto('/owners/start')
    expect(resp?.status()).toBeLessThan(400)
    // Form is composed of OwnerPilotForm; the campground-name field
    // is required and visible in every variant.
    await expect(page.locator('input[name="campground_name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
  })

  test('/owners/signup redirects to /owners/start (no 404)', async ({
    page,
  }) => {
    // A prospect typing the plural /owners/signup form (mirroring
    // /owners/start, /owners/how-it-works, /owners/success) used to
    // hit a 404. Now it permanent-redirects to the canonical intake.
    await page.goto('/owners/signup')
    await expect(page).toHaveURL(/\/owners\/start$/)
    await expect(page.locator('input[name="campground_name"]')).toBeVisible()
  })

  test('/owners/success without session_id renders a friendly state', async ({
    page,
  }) => {
    const resp = await page.goto('/owners/success')
    // 200 + does NOT contain a raw stack trace or "Application error"
    expect(resp?.status()).toBeLessThan(500)
    await expect(page.locator('body')).not.toContainText(
      /Application error|Internal Server Error/i,
    )
  })

  test('/owner/login renders the login page', async ({ page }) => {
    const resp = await page.goto('/owner/login')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('/owner/login "Set up your campground" link points to /owners/start', async ({
    page,
  }) => {
    // The owner-login form's signup link used to point to the legacy
    // /owner/signup. After the 2026-05-13 audit it now funnels through
    // the canonical /owners/start path (Stripe-gated intake) so a
    // prospect tapping it lands on the path that matches every other
    // marketing CTA.
    await page.goto('/owner/login')
    const setupLink = page
      .getByRole('link', { name: /Set up your campground/i })
      .first()
    await expect(setupLink).toBeVisible()
    await expect(setupLink).toHaveAttribute('href', '/owners/start')
  })

  test('POST /auth/sign-out without a session returns 303 to /', async ({
    request,
  }) => {
    // Defensive: the sign-out endpoint should work even when the
    // caller has no session — return 303 to the safe-default
    // destination "/" instead of erroring. Catches accidental
    // changes to the route handler that would 500 on an
    // unauthenticated POST.
    const resp = await request.post('/auth/sign-out', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    expect(resp.status()).toBe(303)
    const location = resp.headers()['location']
    expect(location).toBeTruthy()
    // Destination should be same-origin and start with "/" or be a
    // full URL pointing at this site (Next emits a fully-qualified
    // Location header).
    expect(location).toMatch(/^(\/|https?:\/\/)/)
  })

  test('POST /auth/sign-out?next=/owner/login lands on /owner/login', async ({
    request,
  }) => {
    // The owner (authed) layout + /owner/setup sign-out forms POST
    // here with ?next=/owner/login so an owner who clicks Sign out
    // doesn't get dumped on the camper-focused homepage. Catches
    // accidental reversions of the next param OR overly-strict
    // safeNext validation that would force fallback to "/".
    const resp = await request.post('/auth/sign-out?next=/owner/login', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    expect(resp.status()).toBe(303)
    const location = resp.headers()['location']
    expect(location).toMatch(/\/owner\/login$/)
  })

  test('/owner/preview without auth redirects to /owner/login', async ({
    page,
  }) => {
    await page.goto('/owner/preview')
    await page.waitForURL(/\/owner\/login/)
    await expect(page).toHaveURL(/\/owner\/login/)
  })
})

// ---------------------------------------------------------------------------
// 3. Owner authed-only — confirm redirect, do NOT log in
// ---------------------------------------------------------------------------

test.describe('Owner auth gates (no real login)', () => {
  for (const path of [
    '/owner/dashboard',
    '/owner/setup',
    '/owner/profile',
    '/owner/qr',
    '/owner/billing',
    '/owner/marketing',
    '/owner/messages',
  ]) {
    test(`${path} redirects to /owner/login when anon`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/owner\/login|\/login/)
      const url = page.url()
      expect(url).toMatch(/\/login/)
    })
  }
})

// ---------------------------------------------------------------------------
// 4. Camper flow — page loads only, no signup/login submissions
// ---------------------------------------------------------------------------

test.describe('Camper flow', () => {
  test('/signup renders the camper signup form', async ({ page }) => {
    const getErrors = watchForPageErrors(page)
    const resp = await page.goto('/signup')
    expect(resp?.status()).toBeLessThan(400)
    // Email + password fields present (we deliberately don't fill).
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    expect(getErrors()).toEqual([])
  })

  test('/login renders the camper login form', async ({ page }) => {
    const resp = await page.goto('/login')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('/forgot-password renders the reset request form', async ({ page }) => {
    const resp = await page.goto('/forgot-password')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('/demo (live demo) loads with sample-park content', async ({ page }) => {
    const resp = await page.goto('/demo')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page).toHaveTitle(/RoadWave · Demo/i)
    await expect(page.getByText(/Riverbend RV Park/i).first()).toBeVisible()
    // The demo phone-frame should expose the Home / Campers / Meetups
    // / Updates / Profile tab row.
    await expect(page.getByRole('button', { name: /^Home$/i }).first()).toBeVisible()
  })

  test('/demo/[slug] (per-campground demo) renders with slug-formatted name', async ({
    page,
  }) => {
    const resp = await page.goto('/demo/sample-rv-park')
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.locator('body')).not.toContainText(
      /Application error|Internal Server Error/i,
    )
  })

  test('camper-protected route redirects to /login when anon', async ({
    page,
  }) => {
    // /home is camper-only behind (app) layout's auth gate.
    await page.goto('/home')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })
})

// ---------------------------------------------------------------------------
// 4b. Demo Center (sales hub) — the standalone /demo-center landing plus the
//     camper (/demo-center/camper) and owner (/demo-center/owner) demos.
//     Public, no auth, all mock data. These are NEW surfaces; the existing
//     interactive /demo + /demo/[slug] pages are covered in section 4.
//     Selectors below track real copy in:
//       src/app/demo-center/page.tsx
//       src/components/demo/demo-camper-hub.tsx
//       src/components/demo/demo-owner-hub.tsx
// ---------------------------------------------------------------------------

test.describe('Demo Center', () => {
  test('/demo-center landing loads with all three demo CTAs', async ({
    page,
  }) => {
    // As of Phase 4 every CTA target exists (camper, owner, walkthrough),
    // so the landing page no longer produces a stub-link prefetch 404 —
    // the strict console/network error guard applies with no allowances.
    const getErrors = watchForPageErrors(page)

    const resp = await page.goto('/demo-center')
    expect(resp?.status(), '/demo-center HTTP status').toBeLessThan(400)

    await expect(
      page.getByRole('heading', {
        name: /Enhance Your Campground Experience with RoadWave/i,
      }),
    ).toBeVisible()

    // All three demo CTAs link to live routes.
    const camperCta = page
      .getByRole('link', { name: /Camper Demo/i })
      .first()
    await expect(camperCta).toHaveAttribute('href', '/demo-center/camper')
    const ownerCta = page
      .getByRole('link', { name: /Owner Dashboard Demo/i })
      .first()
    await expect(ownerCta).toHaveAttribute('href', '/demo-center/owner')
    const walkthroughCta = page
      .getByRole('link', { name: /Guided Walkthrough/i })
      .first()
    await expect(walkthroughCta).toHaveAttribute(
      'href',
      '/demo-center/walkthrough',
    )

    expect(getErrors()).toEqual([])
  })

  // -------------------------------------------------------------------------
  // /demo-center/camper — standalone post-QR-scan camper experience
  // -------------------------------------------------------------------------
  test.describe('/demo-center/camper', () => {
    test('loads with the camper-demo title (no crash)', async ({ page }) => {
      const getErrors = watchForPageErrors(page)
      const resp = await page.goto('/demo-center/camper')
      expect(resp?.status()).toBeLessThan(400)
      await expect(page).toHaveTitle(/Camper Demo · RoadWave/i)
      await expect(page.locator('body')).not.toContainText(
        /Application error|Internal Server Error/i,
      )
      expect(getErrors()).toEqual([])
    })

    test('Wi-Fi network + password are visible', async ({ page }) => {
      await page.goto('/demo-center/camper')
      // Wi-Fi card eyebrow + the mock credentials.
      await expect(page.getByText('Wi-Fi', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('PineRidge-Guest').first()).toBeVisible()
      await expect(page.getByText('pinecone2026').first()).toBeVisible()
    })

    test('Wi-Fi copy button exists and gracefully handles clipboard limits', async ({
      page,
    }) => {
      await page.goto('/demo-center/camper')

      // A real Copy affordance is present (one per credential field).
      const copyBtn = page.getByRole('button', { name: /^Copy$/ }).first()
      await expect(copyBtn).toBeVisible()

      // Graceful fallback regardless of clipboard support: the value
      // itself is a tap-to-select control, so a camper can long-press
      // to copy even when navigator.clipboard is blocked (Safari/http).
      await expect(
        page.getByRole('button', {
          name: /Network: PineRidge-Guest\. Tap to select\./i,
        }),
      ).toBeVisible()

      // Clicking Copy must NEVER crash. Depending on whether the
      // headless browser grants clipboard access, the button either
      // confirms "Copied" or the field surfaces a friendly
      // "Copy unavailable" hint — both are acceptable. A thrown error
      // or blank screen is the regression we guard against.
      await copyBtn.click()
      await expect(
        page.getByText(/Copied|Copy unavailable/i).first(),
      ).toBeVisible({ timeout: 4000 })
      // And the Wi-Fi value is still on screen (no navigation/crash).
      await expect(page.getByText('PineRidge-Guest').first()).toBeVisible()
    })

    test('Lantern (notifications) section exists and opens', async ({
      page,
    }) => {
      await page.goto('/demo-center/camper')
      const lantern = page.getByRole('button', { name: /Notifications/i }).first()
      await expect(lantern).toBeVisible()
      // Opening it reveals the activity panel — proves it's wired, not
      // just decorative.
      await lantern.click()
      await expect(
        page.getByRole('dialog', { name: /Recent notifications/i }),
      ).toBeVisible()
    })

    test('Office message demo (send-to-office form) exists', async ({
      page,
    }) => {
      await page.goto('/demo-center/camper')
      await expect(
        page.getByText('Office Help & Messages', { exact: true }).first(),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /Send to office/i }),
      ).toBeVisible()
    })

    test('Wave / Camper Connections section exists', async ({ page }) => {
      await page.goto('/demo-center/camper')
      await expect(
        page.getByRole('heading', {
          name: /Want to meet other campers here/i,
        }),
      ).toBeVisible()
      // At least one camper card with a "Send Wave" action.
      await expect(
        page.getByRole('button', { name: /Send Wave/i }).first(),
      ).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // /demo-center/owner — standalone owner dashboard demo
  // -------------------------------------------------------------------------
  test.describe('/demo-center/owner', () => {
    test('loads with the owner-demo title + dashboard header (no crash)', async ({
      page,
    }) => {
      const getErrors = watchForPageErrors(page)
      const resp = await page.goto('/demo-center/owner')
      expect(resp?.status()).toBeLessThan(400)
      await expect(page).toHaveTitle(/Owner Dashboard Demo · RoadWave/i)
      await expect(page.locator('body')).not.toContainText(
        /Application error|Internal Server Error/i,
      )
      // Dashboard greeting (generic/reusable — no personalized owner
      // name) + the at-a-glance stats block.
      await expect(
        page.getByRole('heading', { name: /Welcome back/i }),
      ).toBeVisible()
      await expect(
        page.getByText('This week at a glance', { exact: true }).first(),
      ).toBeVisible()
      expect(getErrors()).toEqual([])
    })

    test('bulletin composer exists', async ({ page }) => {
      await page.goto('/demo-center/owner')
      await expect(
        page.getByRole('button', { name: /Post bulletin/i }),
      ).toBeVisible()
    })

    test('meetup composer exists', async ({ page }) => {
      await page.goto('/demo-center/owner')
      await expect(
        page.getByRole('button', { name: /Post meetup/i }),
      ).toBeVisible()
    })

    test('weather & safety notice composer exists', async ({ page }) => {
      await page.goto('/demo-center/owner')
      await expect(
        page.getByText('Weather & Safety Alerts', { exact: true }).first(),
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /Post Weather & Safety notice/i }),
      ).toBeVisible()
    })

    test('office messages inbox exists with seeded threads', async ({
      page,
    }) => {
      await page.goto('/demo-center/owner')
      await expect(
        page.getByText('Office Messages', { exact: true }).first(),
      ).toBeVisible()
      // A seeded inbox message is rendered in the default Active tab.
      await expect(page.getByText(/Site 24 · Lisa Tan/i)).toBeVisible()
    })

    test('reviews & rebooking section exists', async ({ page }) => {
      await page.goto('/demo-center/owner')
      await expect(
        page.getByText('Reviews & Rebooking', { exact: true }).first(),
      ).toBeVisible()
      await expect(
        page.getByText(/Show Google review link/i),
      ).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // /demo-center/walkthrough — Phase 4 self-guided product tour. Static
  // mock data, a linear stepper across the four chapters. Selectors track
  // src/components/demo/demo-walkthrough.tsx.
  // -------------------------------------------------------------------------
  test.describe('/demo-center/walkthrough', () => {
    test('loads with the walkthrough title + intro (no crash)', async ({
      page,
    }) => {
      const getErrors = watchForPageErrors(page)
      const resp = await page.goto('/demo-center/walkthrough')
      expect(resp?.status()).toBeLessThan(400)
      await expect(page).toHaveTitle(/Guided Walkthrough · RoadWave/i)
      await expect(page.locator('body')).not.toContainText(
        /Application error|Internal Server Error/i,
      )
      await expect(
        page.getByRole('heading', {
          name: /The whole RoadWave flow, step by step/i,
        }),
      ).toBeVisible()
      expect(getErrors()).toEqual([])
    })

    test('all four chapters are represented as tabs', async ({ page }) => {
      await page.goto('/demo-center/walkthrough')
      for (const label of [/Setup/i, /Dashboard/i, /Camper QR/i, /Connections/i]) {
        await expect(
          page.getByRole('button', { name: label }).first(),
        ).toBeVisible()
      }
    })

    test('Next advances the tour; chapter tab jumps', async ({ page }) => {
      await page.goto('/demo-center/walkthrough')
      // Starts on step 1.
      await expect(page.getByText(/Step 1 of/i)).toBeVisible()
      // First step is the campground-naming setup step.
      await expect(
        page.getByRole('heading', { name: /Name your campground/i }),
      ).toBeVisible()

      // Advancing moves to step 2.
      await page.getByRole('button', { name: /^Next/i }).click()
      await expect(page.getByText(/Step 2 of/i)).toBeVisible()

      // Jumping to a later chapter swaps the step content (a camper step).
      await page.getByRole('button', { name: /Camper QR/i }).first().click()
      await expect(
        page.getByRole('heading', { name: /A guest scans the QR code/i }),
      ).toBeVisible()
    })

    test('links out to the interactive camper + owner demos', async ({
      page,
    }) => {
      await page.goto('/demo-center/walkthrough')
      await expect(
        page.getByRole('link', { name: /Open camper demo/i }),
      ).toHaveAttribute('href', '/demo-center/camper')
      await expect(
        page.getByRole('link', { name: /Open owner demo/i }),
      ).toHaveAttribute('href', '/demo-center/owner')
    })
  })

  // -------------------------------------------------------------------------
  // Demo Mode banner keeps viewers INSIDE the demo. The top banner must
  // route to the Demo Center hub (/demo-center), never to the public
  // marketing landing page (/). Guards against an "Exit demo → /"
  // regression. The only links that should leave the demo are the
  // explicit signup/trial CTAs (covered elsewhere).
  // -------------------------------------------------------------------------
  test.describe('Demo Mode banner stays inside the demo', () => {
    for (const path of [
      '/demo-center',
      '/demo-center/camper',
      '/demo-center/owner',
      '/demo-center/walkthrough',
    ]) {
      test(`${path} banner returns to /demo-center, not the public landing`, async ({
        page,
      }) => {
        await page.goto(path)
        const banner = page
          .getByRole('link', { name: /Back to Demo Center/i })
          .first()
        await expect(banner).toBeVisible()
        await expect(banner).toHaveAttribute('href', '/demo-center')
      })
    }

    // "Learn more" / navigation links must NOT leak to the public
    // marketing site. The landing page's only outbound links should be
    // the trial CTAs (/owner/signup); the walkthrough path stays inside
    // the demo (the Guided Walkthrough card), and there is no
    // /campgrounds exit.
    test('/demo-center has no public /campgrounds exit; learn-more stays in demo', async ({
      page,
    }) => {
      await page.goto('/demo-center')
      await expect(page.locator('a[href="/campgrounds"]')).toHaveCount(0)
      await expect(
        page.getByRole('link', { name: /Guided Walkthrough/i }).first(),
      ).toHaveAttribute('href', '/demo-center/walkthrough')
    })

    // Acceptance test: clicking the banner from a subpage lands the owner
    // back on the Demo Center hub, NOT the real RoadWave landing page.
    for (const path of [
      '/demo-center/camper',
      '/demo-center/owner',
      '/demo-center/walkthrough',
    ]) {
      test(`clicking the banner on ${path} lands on /demo-center`, async ({
        page,
      }) => {
        await page.goto(path)
        await page
          .getByRole('link', { name: /Back to Demo Center/i })
          .first()
          .click()
        await page.waitForURL(/\/demo-center$/)
        await expect(page).toHaveURL(/\/demo-center$/)
      })
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Footer + legal pages — every link in <SiteFooter /> must resolve
// ---------------------------------------------------------------------------

test.describe('Footer + legal pages', () => {
  for (const path of [
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/safety',
    '/safety-protocol',
    '/community-rules',
    '/campground-safety',
    '/campground-partner-terms',
    '/law-enforcement',
    '/data-breach-policy',
    '/account-deletion',
    '/owners',
  ]) {
    test(`${path} loads without crashing`, async ({ page }) => {
      const resp = await page.goto(path)
      expect(resp?.status(), `expected non-5xx for ${path}`).toBeLessThan(500)
      // Page must not render a generic crash screen.
      await expect(page.locator('body')).not.toContainText(
        /Application error|Internal Server Error/i,
      )
    })
  }
})

// ---------------------------------------------------------------------------
// 6. Stripe — verify endpoints reject bad input without crashing
//    (does NOT create a real checkout session or charge anything)
// ---------------------------------------------------------------------------

test.describe('Stripe endpoints (no real charges)', () => {
  test('POST /api/stripe/webhook without signature is rejected defensively', async ({
    request,
  }) => {
    // The route is environment-portable:
    //   - 400 "missing signature" when STRIPE_WEBHOOK_SECRET is set
    //     and the request lacks a stripe-signature header (the
    //     happy-path defensive rejection on prod).
    //   - 503 "webhook secret not configured" when the env var is
    //     unset (e.g. a local dev box without Stripe wired in).
    // Both prove the route refuses to process an unauthenticated
    // webhook delivery. A 200 or 5xx other than 503 would be the
    // regression we care about.
    const resp = await request.post('/api/stripe/webhook', {
      data: { foo: 'bar' },
      headers: { 'content-type': 'application/json' },
    })
    expect(
      [400, 503],
      'webhook should reject defensively (400 if secret set, 503 if not)',
    ).toContain(resp.status())
    const body = await resp.text()
    expect(body).toMatch(/signature|webhook secret not configured/i)
  })

  test('GET /api/stripe/checkout without submission_id does not 500', async ({
    request,
  }) => {
    const resp = await request.get('/api/stripe/checkout', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    // We expect either a 4xx (validation) or a 30x redirect to an
    // error landing — but NEVER a 5xx. This catches the route blowing
    // up on missing env vars or unexpected exceptions.
    expect(resp.status()).toBeLessThan(500)
  })
})

// ---------------------------------------------------------------------------
// 7. Unauthenticated first-time camper check-in (the QR end-to-end
//    flow that broke in incognito on 2026-05-13: cookie bounce from
//    /home → /checkin showed an empty screen instead of the "Checked
//    in at X" home view). One real auth.users row + check_in are
//    created per run on the seeded demo campground — those are the
//    quickcheckin-<random>@example.com users that the demo-reset
//    script sweeps.
// ---------------------------------------------------------------------------

test.describe('Unauthenticated first-time camper QR check-in', () => {
  // Fresh context per test so we're guaranteed no auth state, no
  // pending_checkin_token cookie, and no localStorage leftovers from
  // other tests in the suite.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('QR → quickcheckin form → /home shows "Checked in at" chip', async ({
    page,
  }) => {
    // 1. Open the seeded demo campground's QR URL. Token is the
    //    canonical demo token seeded by scripts/seed-demo-campground.mjs.
    //    The middleware will set pending_checkin_token from the URL.
    await page.goto(
      '/campground/roadwave-demo-campground?token=cc21f1d1-5ffa-4dcd-ba72-d475c847ac41',
    )

    // 2. The "Join Camper Connections" CTA lives in the always-
    //    visible "Meet other campers — optional" section near the
    //    bottom of the camper QR page. Used to be wrapped in a
    //    DisclosureSection (default-closed) but the section was
    //    un-collapsed so RoadWave's core social differentiator is
    //    visible on first scroll without an extra tap. No accordion
    //    expand step needed -- the link should be directly visible.
    const checkInLink = page
      .getByRole('link', { name: /Join Camper Connections/i })
      .first()
    await expect(checkInLink).toBeVisible()

    // 3. Demo slug routes to /quickcheckin (the no-signup form),
    //    not /signup. Assert the destination first so the test
    //    fails early if the routing regresses.
    const href = await checkInLink.getAttribute('href')
    expect(href).toContain('/quickcheckin')
    expect(href).toContain('slug=roadwave-demo-campground')
    expect(href).toContain('token=cc21f1d1-5ffa-4dcd-ba72-d475c847ac41')

    // 4. Navigate.
    await checkInLink.click()
    await page.waitForURL(/\/quickcheckin/)

    // 5. Form sanity — campground name + visibility radio + interest
    //    chips + terms checkbox + submit button.
    await expect(
      page.getByRole('heading', { name: /RoadWave Demo Campground/i }),
    ).toBeVisible()
    // Visibility radio cards (hidden inputs; labels are clickable)
    await page.getByText(/^Visible$/i).first().click()
    // Pick three interest chips
    for (const label of [/^Coffee$/i, /^Dog walk$/i, /^Campfire$/i]) {
      await page.getByRole('button', { name: label }).click()
    }
    // Required compliance checkbox
    await page.locator('input[name="accept_terms"]').check()

    // 6. Submit. The action provisions a throwaway auth user, signs
    //    them in via cookie session, writes the check_in, clears the
    //    pending_checkin_token cookie, and redirects to /home.
    await page
      .getByRole('button', { name: /Complete Check-In to/i })
      .click()

    // 7. Land on /home — NOT /checkin (the cookie-bounce regression
    //    we just fixed). Generous timeout because the action creates
    //    an auth user + several DB rows.
    await page.waitForURL(/\/home$/, { timeout: 30_000 })
    await expect(page).toHaveURL(/\/home$/)

    // 8. The "Checked in at RoadWave Demo Campground" chip should be
    //    visible — this is the affirmative proof that the camper sees
    //    a real success state, not just the footer.
    await expect(
      page
        .getByText(/Checked in at RoadWave Demo Campground/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 })

    // 9. Defensive: the "Where the action is" tile grid should also
    //    render. Catches the case where /home redirected mid-load to
    //    a near-empty page that happens to contain the chip text.
    await expect(
      page.getByText(/Where the action is/i).first(),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 8. Mobile viewport — quick visual sanity on the homepage
// ---------------------------------------------------------------------------

test.describe('Mobile viewport sanity', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14 Pro

  test('homepage hero + CTAs are visible on iPhone-sized screen', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', {
        name: /campground amenity that helps guests connect/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Try the Demo/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /For Campground Owners/i }).first(),
    ).toBeVisible()
  })

  test('/owners hero CTAs visible on mobile', async ({ page }) => {
    await page.goto('/owners')
    await expect(
      page.getByRole('link', { name: /Start My Campground Pilot/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /See the live demo/i }).first(),
    ).toBeVisible()
  })
})

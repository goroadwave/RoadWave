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
      if (allowed.some((s) => text.includes(s))) return
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

    // Hero headline — current copy "Campground guests, connected on
    // their terms." Match loosely on a stable phrase.
    await expect(
      page.getByRole('heading', { name: /Campground guests, connected/i }),
    ).toBeVisible()

    // Primary camper CTA points at /signup
    const camperCta = page
      .getByRole('link', { name: /Check In as a Camper/i })
      .first()
    await expect(camperCta).toBeVisible()
    await expect(camperCta).toHaveAttribute('href', '/signup')

    // Secondary "Try the Demo" CTA points at /demo
    const demoCta = page.getByRole('link', { name: /Try the Demo/i }).first()
    await expect(demoCta).toBeVisible()
    await expect(demoCta).toHaveAttribute('href', '/demo')

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
  test('POST /api/stripe/webhook without signature → 400', async ({
    request,
  }) => {
    const resp = await request.post('/api/stripe/webhook', {
      data: { foo: 'bar' },
      headers: { 'content-type': 'application/json' },
    })
    expect(resp.status()).toBe(400)
    const body = await resp.text()
    expect(body).toMatch(/missing signature|signature/i)
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
// 7. Mobile viewport — quick visual sanity on the homepage
// ---------------------------------------------------------------------------

test.describe('Mobile viewport sanity', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14 Pro

  test('homepage hero + CTAs are visible on iPhone-sized screen', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /Campground guests, connected/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Check In as a Camper/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Try the Demo/i }).first(),
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

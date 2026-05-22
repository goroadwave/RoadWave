// @ts-check
//
// Phase 1-3 of the signed-in hub pivot (commits 967193e, 68b0ca8,
// f7d5d63). Asserts that the public campground hub and the retired
// /checkin / /nearby surfaces no longer expose the old check-in
// language to anonymous visitors (the path real campers walk after
// a QR scan). Each retired phrase corresponds to a copy element
// the redesign explicitly removed.
//
// Mobile-safari (iPhone 14 Pro 390x844) is the primary surface
// for QR scans, so this suite is opted-in by name to that project
// via the playwright.config.js mobile-safari project. Add
// --project=mobile-safari when invoking to run only on WebKit.
//
// What this CANNOT cover from CI without provisioned auth state:
//   * The signed-in render of /campground/[slug] with the
//     CamperConnectionsCard layered in. The quickcheckin flow does
//     exercise this end-to-end and is covered by smoke.test.js.

import { expect, test } from '@playwright/test'

const QR_PATH = '/campground/roadwave-demo-campground'
const DEMO_TOKEN = 'cc21f1d1-5ffa-4dcd-ba72-d475c847ac41'

// Strings retired by Phase 1-3. None of these should appear on an
// anonymous-arrival surface in the new flow.
const RETIRED_PHRASES = [
  "You're not checked in",
  "Nobody's home",
  'Scan a QR and the locals will show up here',
  'Where are you parked?',
  "24 hours, then you're invisible again",
  'Paste a check-in link',
]

test.use({ viewport: { width: 390, height: 844 } })

test.describe('Signed-in hub copy (anon visit)', () => {
  test('campground hub: new copy present, retired copy absent', async ({
    page,
  }) => {
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)

    // New Phase 1 copy: the anon "Meet other campers — optional"
    // card uses the same headline as the authed Camper Connections
    // card, so this surfaces on the anon path too.
    await expect(
      page
        .getByText('Find your campground people without making it weird.')
        .first(),
    ).toBeVisible()

    // The anon CTA must still be present and point at /quickcheckin
    // (demo slug) or /signup with next=/campground/<slug>.
    const joinLink = page
      .getByRole('link', { name: /Join Camper Connections/i })
      .first()
    await expect(joinLink).toBeVisible()
    const href = await joinLink.getAttribute('href')
    expect(href, 'CTA must not point at /checkin').not.toMatch(/^\/checkin/)
    expect(
      href,
      'CTA must point at /quickcheckin (demo) or /signup with hub-return next',
    ).toMatch(/^\/(quickcheckin|signup)\b/)
    if (href && href.startsWith('/signup')) {
      expect(
        href,
        'signup next= must land back on /campground/<slug>',
      ).toContain('next=%2Fcampground%2F')
    }

    // Retired copy must not appear anywhere on the page body.
    const body = await page.locator('body').innerText()
    for (const phrase of RETIRED_PHRASES) {
      expect(body, `anon hub must not contain "${phrase}"`).not.toContain(
        phrase,
      )
    }
  })

  test('campground hub: lands at the top on first open', async ({ page }) => {
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)
    // Sleep past the 3s pin window so a delayed pin doesn't mask a
    // mid-page landing in the test screenshot.
    await page.waitForTimeout(3200)
    const y = await page.evaluate(() => window.scrollY || 0)
    expect(y, 'first-open scrollY must be at the top').toBeLessThanOrEqual(50)
  })

  test('campground hub: lands at the top after reload', async ({ page }) => {
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForTimeout(3200)
    const y = await page.evaluate(() => window.scrollY || 0)
    expect(y, 'reload scrollY must be at the top').toBeLessThanOrEqual(50)
  })

  test('Sign in link from QR header preserves campground context', async ({
    page,
  }) => {
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)
    const signIn = page.getByRole('link', { name: /^Sign in$/ }).first()
    await expect(signIn).toBeVisible()
    const href = await signIn.getAttribute('href')
    expect(href).toContain('intent=profile')
    expect(href).toContain('slug=roadwave-demo-campground')
    expect(
      href,
      'profile sign-in next= must point back to the same campground hub',
    ).toContain('next=%2Fcampground%2Froadwave-demo-campground')
  })

  test('connections-intent login surface: next= forwards to hub', async ({
    page,
  }) => {
    const nextHubUrl = `/campground/roadwave-demo-campground?token=${DEMO_TOKEN}`
    await page.goto(
      `/login?intent=connections&slug=roadwave-demo-campground&next=${encodeURIComponent(
        nextHubUrl,
      )}`,
    )
    // Page renders (no crash) and the intent-aware header is visible.
    await expect(
      page.getByText(/Camper Connections at/i).first(),
    ).toBeVisible()
    // The OAuth button forwards `next` via a hidden input or href.
    // Just assert no retired copy leaks into this surface.
    const body = await page.locator('body').innerText()
    for (const phrase of RETIRED_PHRASES) {
      expect(body, `login page must not contain "${phrase}"`).not.toContain(
        phrase,
      )
    }
  })
})

// Authed render of the hub. Uses the quickcheckin demo flow (same one
// covered by smoke.test.js) to provision a throwaway camper account,
// then visits /campground/<slug> directly to assert the
// CamperConnectionsCard layers in correctly. Each run creates a
// quickcheckin-<random>@example.com user that the demo-reset script
// sweeps.
//
// Tests in this block are serialized (mode: 'serial') because they
// all do back-to-back Supabase auth user creation via quickcheckin.
// Running them in parallel hits an implicit rate limit on the auth
// /signup endpoint and the second test flakes on "Coffee button not
// found" -- the form just hadn't loaded the interest chips yet.
test.describe.configure({ mode: 'serial' })

test.describe('Signed-in hub (authed visit)', () => {
  test('CamperConnectionsCard renders on /nearby (focused page, not embedded in the hub)', async ({
    page,
  }) => {
    // IA v6 (2026-05-22): the CamperConnectionsCard moved off the
    // long campground hub onto its own dedicated /nearby page.
    // This test verifies that move + that all the same affordances
    // (visibility pills, edit interests, privacy settings) are
    // still reachable.

    // 1. Provision a fresh camper via the demo quickcheckin form.
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)
    await page.getByRole('link', { name: /Join Camper Connections/i }).first().click()
    await page.waitForURL(/\/quickcheckin/)
    await page.getByText(/^Visible$/i).first().click()
    for (const label of [/^Coffee$/i, /^Dog walk$/i, /^Campfire$/i]) {
      await page.getByRole('button', { name: label }).click()
    }
    await page.locator('input[name="accept_terms"]').check()
    await page
      .getByRole('button', { name: /Complete Check-In to/i })
      .click()
    await page.waitForURL(/\/home$/, { timeout: 30_000 })

    // 2. Visit /nearby -- the focused Camper Connections page.
    await page.goto('/nearby')
    await expect(page).toHaveURL(/\/nearby$/)

    // 3. Page-level heading + camper-card section heading.
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Camper Connections at/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByText('Find your campground people without making it weird.').first(),
    ).toBeVisible()

    // 4. Visibility pills must be in the DOM, Visible pressed.
    const visiblePill = page.getByRole('button', { name: /^Visible$/ }).first()
    await expect(visiblePill).toBeVisible()
    await expect(visiblePill).toHaveAttribute('aria-pressed', 'true')

    // 5. Edit interests + Privacy settings links present.
    await expect(
      page.getByRole('link', { name: /Edit interests/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Privacy settings/i }),
    ).toBeVisible()

    // 6. The anon CTA's primary button "Join Camper Connections"
    //    must NOT be on this page (we already joined).
    await expect(
      page.getByRole('link', { name: /Join Camper Connections/i }),
    ).toHaveCount(0)

    // 7. Lands at the top -- focused page, no anchor-jump halfway
    //    down a mixed surface anymore.
    await page.waitForTimeout(1500)
    const y = await page.evaluate(() => window.scrollY || 0)
    expect(y, '/nearby must land at the top').toBeLessThanOrEqual(50)
  })

  test('the signed-in hub shows campground utility only (no embedded CamperConnections)', async ({
    page,
  }) => {
    // Provision via quickcheckin (same demo flow).
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)
    await page.getByRole('link', { name: /Join Camper Connections/i }).first().click()
    await page.waitForURL(/\/quickcheckin/)
    await page.getByText(/^Visible$/i).first().click()
    await page.getByRole('button', { name: /^Coffee$/i }).click()
    await page.locator('input[name="accept_terms"]').check()
    await page
      .getByRole('button', { name: /Complete Check-In to/i })
      .click()
    await page.waitForURL(/\/home$/, { timeout: 30_000 })

    // After IA v6, /campground/<slug> for signed-in campers shows
    // the SAME campground utility (Wi-Fi, map, rules, amenities,
    // updates, meetups, office help) as anon visitors -- no
    // embedded CamperConnectionsCard, no in-body AppNav.
    await page.goto(QR_PATH)
    await expect(page).toHaveURL(/\/campground\/roadwave-demo-campground/)

    // The "Find your campground people..." headline -- previously
    // also on the CamperConnectionsCard for authed users -- now
    // only appears as the anon CTA. For an authed visitor it must
    // NOT show (they see the smaller "Camper Connections live on
    // My RoadWave" banner instead).
    await expect(
      page.getByText('Find your campground people without making it weird.'),
    ).toHaveCount(0)

    // The small banner that points to /nearby + /home must be
    // present so the signed-in camper has a one-tap path to the
    // camper-to-camper layer.
    await expect(
      page.getByRole('link', { name: /Campers here →/i }).first(),
    ).toBeVisible()
    const camperLink = page.getByRole('link', { name: /Campers here →/i }).first()
    expect(await camperLink.getAttribute('href')).toBe('/nearby')
  })

  test('AppNav renders inside the (app) layout (Home, Waves, Past Waves)', async ({
    page,
  }) => {
    // Provision via quickcheckin.
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)
    await page.getByRole('link', { name: /Join Camper Connections/i }).first().click()
    await page.waitForURL(/\/quickcheckin/)
    await page.getByText(/^Visible$/i).first().click()
    await page.getByRole('button', { name: /^Coffee$/i }).click()
    await page.locator('input[name="accept_terms"]').check()
    await page.getByRole('button', { name: /Complete Check-In to/i }).click()
    await page.waitForURL(/\/home$/, { timeout: 30_000 })

    // AppNav lives on every (app)-group page (/home, /nearby,
    // /waves, /crossed-paths, /settings/privacy). It's no longer
    // embedded in the QR campground hub. Verify the five-tab v6
    // set is reachable from /home.
    for (const label of ['Home', 'Campground', 'Camper Connections', 'Waves', 'Past Waves']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first(),
        `AppNav must expose "${label}" on /home`,
      ).toBeVisible()
    }

    // Waves tab routes to /waves.
    const wavesLink = page.getByRole('link', { name: /^Waves$/i }).first()
    expect(await wavesLink.getAttribute('href')).toBe('/waves')

    // Past Waves tab routes to /crossed-paths.
    const pastWavesLink = page
      .getByRole('link', { name: /^Past Waves$/i })
      .first()
    expect(await pastWavesLink.getAttribute('href')).toBe('/crossed-paths')

    // Camper Connections tab routes to /nearby (NOT a hub anchor).
    const ccLink = page
      .getByRole('link', { name: /^Camper Connections$/i })
      .first()
    expect(await ccLink.getAttribute('href')).toBe('/nearby')
  })
})

test.describe('AppNav visibility on the public hub (anon)', () => {
  test('AppNav does NOT render on the hub when anonymous', async ({
    page,
  }) => {
    // Fresh anon context -- the hub must NOT show the authenticated
    // nav strip. The "Sign in" header link is the only entry to
    // auth, by design.
    await page.goto(`${QR_PATH}?token=${DEMO_TOKEN}`)

    // Each AppNav tab label that does NOT also appear as page
    // content. "Home" would also match "RoadWave home" in some
    // anon copy, so we instead check the unique AppNav-only tabs.
    for (const label of ['Camper Connections', 'Waves', 'Past Waves']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }),
        `anon hub must not expose AppNav tab "${label}"`,
      ).toHaveCount(0)
    }

    // The "Sign in" link IS visible -- it's the only auth entry.
    await expect(
      page.getByRole('link', { name: /^Sign in$/ }).first(),
    ).toBeVisible()
  })
})

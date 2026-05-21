// @ts-check
//
// Two related bug reports, both about the same product invariant:
// "after sign-in/sign-up, the camper lands on the page they actually
// asked for, not the campground QR hub by default."
//
// Part 1 (already covered): clicking AppNav tabs from /campground/<slug>
// while already signed-in must land + STAY on the tab's destination.
// Camper Connections, Waves, Past Waves, Privacy, Profile, Meetups
// were reported as bouncing back to the hub.
//
// Part 2 (added 2026-05-21): a signed-out camper opening a subject
// page directly (shared link, refreshed tab, expired session) must be
// bounced to /login with the intended destination preserved as ?next=
// AND must end up on that destination after signing in. The previous
// behavior dropped the path during the redirect to /login, then the
// post-auth fallback routed the camper to the campground hub instead
// of where they actually came from.
//
// This suite provisions a real signed-in camper via the quickcheckin
// demo flow, navigates to the hub, and clicks each AppNav tab one at
// a time. After each click it asserts:
//   * The browser URL is the tab's destination (not /campground/<slug>).
//   * The page has stayed on that URL after a 1-second settle window
//     (catches any delayed client-side router.push that would relaunch
//     the bounce after navigation completes).
//   * A reload of the destination URL keeps the camper on the
//     destination, not back on the hub.
//
// By design, two tabs DO route through the hub:
//   * "Campground" → /checkin → /campground/<slug>   (the hub IS Campground info)
//   * "Camper Connections" → /nearby → /campground/<slug>#camper-connections
// These are documented and intentional. The other five tabs MUST
// land on their own routes.

import { expect, test } from '@playwright/test'

const QR_SLUG = 'roadwave-demo-campground'
const DEMO_TOKEN = 'cc21f1d1-5ffa-4dcd-ba72-d475c847ac41'

test.use({ viewport: { width: 390, height: 844 } })

// Provision a fresh camper via the demo quickcheckin form. Lands them
// on /home with an active check-in. Each test starts here.
async function provision(page) {
  await page.goto(`/campground/${QR_SLUG}?token=${DEMO_TOKEN}`)
  await page
    .getByRole('link', { name: /Join Camper Connections/i })
    .first()
    .click()
  await page.waitForURL(/\/quickcheckin/)
  await page.getByText(/^Visible$/i).first().click()
  await page.getByRole('button', { name: /^Coffee$/i }).click()
  await page.locator('input[name="accept_terms"]').check()
  await page.getByRole('button', { name: /Complete Check-In to/i }).click()
  await page.waitForURL(/\/home$/, { timeout: 30_000 })
}

test.describe.configure({ mode: 'serial' })

test.describe('AppNav tabs: stay on their destinations after click', () => {
  // Each tab that should land + stay on its own route. We test from
  // the hub specifically since that's where the user reported the
  // bug.
  const STAYS = [
    { label: /^Home$/, expectedUrl: /\/home$/ },
    { label: /^Meetups$/, expectedUrl: /\/meetups$/ },
    { label: /^Waves$/, expectedUrl: /\/waves$/ },
    { label: /^Privacy$/, expectedUrl: /\/settings\/privacy$/ },
    { label: /^Past Waves$/, expectedUrl: /\/crossed-paths$/ },
  ]

  test('all five non-hub tabs land + stay on their destinations from the hub', async ({
    page,
  }) => {
    await provision(page)
    for (const tab of STAYS) {
      // Start fresh on the campground hub for each tab so the AppNav
      // is mounted and we're testing the click from the surface the
      // user reported the bug on.
      await page.goto(`/campground/${QR_SLUG}`)
      await expect(
        page.getByRole('link', { name: tab.label }).first(),
        `AppNav must expose tab for ${tab.label}`,
      ).toBeVisible()
      await page
        .getByRole('link', { name: tab.label })
        .first()
        .click()
      await page.waitForURL(tab.expectedUrl, { timeout: 10_000 })

      // 1-second settle window catches a delayed router.push that
      // would relaunch the bounce after navigation completes.
      await page.waitForTimeout(1000)
      expect(
        page.url(),
        `${tab.label} must STAY on its destination URL, not bounce back to the hub`,
      ).toMatch(tab.expectedUrl)

      // Reload from the destination URL -- must still stay.
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      expect(
        page.url(),
        `${tab.label} must stay on its destination after a reload`,
      ).toMatch(tab.expectedUrl)
    }
  })

  test('Campground tab routes to /checkin which lands the camper on /campground/<slug> (by design)', async ({
    page,
  }) => {
    await provision(page)
    await page.goto(`/campground/${QR_SLUG}`)
    await page.getByRole('link', { name: /^Campground$/ }).first().click()
    await page.waitForURL(
      new RegExp(`/campground/${QR_SLUG}(\\?.*)?$`),
      { timeout: 10_000 },
    )
    // After landing, the URL should be the campground hub. This is
    // the intended behavior: "Campground" tab opens campground info.
  })

  test('Camper Connections tab deep-links to /campground/<slug>#camper-connections (by design)', async ({
    page,
  }) => {
    await provision(page)
    await page.goto(`/campground/${QR_SLUG}`)
    await page
      .getByRole('link', { name: /^Camper Connections$/ })
      .first()
      .click()
    await page.waitForURL(
      new RegExp(`/campground/${QR_SLUG}(\\?.*)?#camper-connections$`),
      { timeout: 10_000 },
    )
  })

  test('Profile is reachable from the Camper Connections card "Edit interests" link', async ({
    page,
  }) => {
    // Profile isn't in AppNav -- it's reached from the Camper
    // Connections card on the hub. The user's bug report mentioned
    // Profile, so we confirm clicking "Edit interests" lands on
    // /profile/setup and stays.
    await provision(page)
    await page.goto(`/campground/${QR_SLUG}`)
    await page
      .getByRole('link', { name: /Edit interests/i })
      .first()
      .click()
    await page.waitForURL(/\/profile\/setup$/, { timeout: 10_000 })
    await page.waitForTimeout(1000)
    expect(page.url()).toMatch(/\/profile\/setup$/)
  })

  test('Privacy settings link from Camper Connections card lands + stays', async ({
    page,
  }) => {
    await provision(page)
    await page.goto(`/campground/${QR_SLUG}`)
    await page
      .getByRole('link', { name: /Privacy settings/i })
      .first()
      .click()
    await page.waitForURL(/\/settings\/privacy$/, { timeout: 10_000 })
    await page.waitForTimeout(1000)
    expect(page.url()).toMatch(/\/settings\/privacy$/)
  })

  test('RoadWave Stops list on /profile links back to the campground hub (intentional)', async ({
    page,
  }) => {
    await provision(page)
    // Visit the hub once so a roadwave_stops row exists for the demo
    // campground.
    await page.goto(`/campground/${QR_SLUG}`)
    await page.goto('/profile')
    await expect(
      page.getByRole('heading', { name: /RoadWave Stops/i }),
    ).toBeVisible()

    // Each stop card is a link back to its campground hub. This is
    // intentional: a "stop" IS a record of being at that campground.
    await page
      .getByRole('link', { name: /RoadWave Demo Campground/i })
      .first()
      .click()
    await page.waitForURL(new RegExp(`/campground/${QR_SLUG}$`), {
      timeout: 10_000,
    })
  })
})

// Part 2: signed-out camper hitting a subject page directly should be
// bounced to /login with ?next=<the page they came from>, and signing
// in should land them back on that exact page. Each subject page is
// guarded by the (app) layout; before the fix the layout did a bare
// redirect('/login') with no return address, and the post-auth
// fallback always sent guests to /home or the campground hub.
test.describe('Signed-out subject pages preserve their destination through /login', () => {
  // Browser-level concurrency: each subject path gets its own clean
  // context so a single failure doesn't poison the rest, AND so we
  // can assert the (app) layout's behavior with NO cookies at all.
  const SUBJECT_PATHS = [
    '/home',
    '/waves',
    '/crossed-paths',
    '/meetups',
    '/settings/privacy',
    '/profile',
  ]

  for (const path of SUBJECT_PATHS) {
    test(`signed-out visit to ${path} redirects to /login?next=${encodeURIComponent(path)}`, async ({
      browser,
    }) => {
      // Fresh context = no auth cookies. The (app) layout MUST send us
      // to /login with the intended destination preserved.
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const page = await ctx.newPage()
      try {
        await page.goto(path)
        await page.waitForURL(/\/login(?:\?|$)/, { timeout: 10_000 })
        const url = new URL(page.url())
        expect(
          url.pathname,
          `${path} signed-out must land on /login`,
        ).toBe('/login')
        expect(
          url.searchParams.get('next'),
          `${path} signed-out must include ?next=${path} on /login`,
        ).toBe(path)
      } finally {
        await ctx.close()
      }
    })
  }
})

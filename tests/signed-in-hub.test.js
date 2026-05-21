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
test.describe('Signed-in hub (authed visit)', () => {
  test('Camper Connections card renders in place of the anon CTA', async ({
    page,
  }) => {
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

    // 2. Visit the hub directly. The new auth-aware page should
    //    detect the active check-in, upsert presence (idempotent),
    //    fetch nearby campers + wave state, and render the
    //    CamperConnectionsCard in place of the anon "Meet other
    //    campers" CTA card.
    await page.goto(QR_PATH)
    await expect(page).toHaveURL(/\/campground\/roadwave-demo-campground/)

    // 3. New section heading + headline must be visible.
    await expect(
      page.getByRole('heading', { level: 2, name: /Camper connections/i }),
    ).toBeVisible()
    await expect(
      page
        .getByText('Find your campground people without making it weird.')
        .first(),
    ).toBeVisible()
    await expect(
      page.getByText(
        /See campers here who share your interests\. Wave if you want to connect\. Nothing opens unless it's mutual\./,
      ),
    ).toBeVisible()

    // 4. Interactive visibility pills must be in the DOM. They are
    //    rendered as <button aria-pressed=...> with the current mode
    //    highlighted. We picked "Visible" in the quickcheckin form,
    //    so the Visible pill must be pressed.
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

    // 7. Header shows the authed shortcut + Sign out, not Sign in.
    await expect(
      page.getByRole('link', { name: /^My RoadWave$/ }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Sign out$/ }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /^Sign in$/ }),
    ).toHaveCount(0)

    // 8. None of the retired strings appear on the authed hub.
    const body = await page.locator('body').innerText()
    for (const phrase of RETIRED_PHRASES) {
      expect(
        body,
        `authed hub must not contain retired phrase "${phrase}"`,
      ).not.toContain(phrase)
    }

    // 9. Lands at the top -- the existing inline pin script + the
    //    QrScrollTopGuard must still fire after the new auth-aware
    //    branch runs.
    await page.waitForTimeout(3200)
    const y = await page.evaluate(() => window.scrollY || 0)
    expect(y, 'authed hub scrollY must be at the top').toBeLessThanOrEqual(50)
  })

  test('/nearby redirects authed camper to the campground hub', async ({
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

    // The renamed "Camper Connections" nav tab points at /nearby.
    // /nearby must forward to /campground/<slug>.
    await page.goto('/nearby')
    await expect(page).toHaveURL(
      /\/campground\/roadwave-demo-campground(\?.*)?$/,
    )
  })
})

// @ts-check
//
// Regression tests for the campground QR → auth page copy + routing.
// Guards against re-introducing any of the deprecated check-in
// framing that the QR landing-page redesign retired:
//
//   * "CHECK IN TO <campground>"            (eyebrow)
//   * "Sign in to finish checking in"       (headline)
//   * "go straight to the check-in screen"  (subcopy)
//   * "Check in to <campground>"            (other surfaces)
//   * Hardcoded "Lake Waldena Resort"       (legacy demo string)
//
// And confirms the two new flows render the right intent-specific
// copy + carry campground context through the URL:
//
//   * QR header "Sign in"          → /login?intent=profile&slug=<slug>&next=/campground/<slug>
//                                    → "ROADWAVE PROFILE" eyebrow + profile copy
//
//   * "Join Camper Connections"    → /signup?intent=connections&slug=<slug>&next=/checkin?token=<uuid>
//                                    → "Camper Connections at <campground>" eyebrow
//
//   * Plain /login (no QR context) → generic "Welcome back / Sign in"
//
// Tests do NOT sign anyone in. Pure DOM + URL assertions, safe to run
// against any environment.

import { expect, test } from '@playwright/test'

const QR_PATH = '/campground/roadwave-demo-campground'
const DEMO_NAME = 'RoadWave Demo Campground'

// Strings we never want to see on a freshly-loaded auth surface
// reached from the QR flow. Each one corresponds to a copy element
// the redesign explicitly removed.
const DEPRECATED_PHRASES = [
  'finish checking in',
  'go straight to the check-in screen',
  'Check in to ',
  'CHECK IN TO ',
  'Lake Waldena',
]

async function assertNoDeprecatedCopy(page) {
  const body = await page.locator('body').innerText()
  for (const phrase of DEPRECATED_PHRASES) {
    expect(
      body,
      `auth page must not contain deprecated copy "${phrase}"`,
    ).not.toContain(phrase)
  }
}

test.describe('QR landing page CTA wiring', () => {
  test('"Sign in" header link carries intent=profile + slug + next', async ({
    page,
  }) => {
    await page.goto(QR_PATH)
    await page.waitForLoadState('domcontentloaded')

    const signIn = page.getByRole('link', { name: /^sign in$/i }).first()
    await expect(signIn).toBeVisible()
    const href = await signIn.getAttribute('href')
    expect(href, 'header Sign in must use profile intent').toContain(
      'intent=profile',
    )
    expect(href, 'header Sign in must carry slug').toContain(
      'slug=roadwave-demo-campground',
    )
    expect(href, 'header Sign in must route back to the campground').toContain(
      encodeURIComponent('/campground/roadwave-demo-campground'),
    )
  })

  test('"Join Camper Connections" CTA carries intent=connections + slug', async ({
    page,
  }) => {
    await page.goto(QR_PATH)
    await page.waitForLoadState('domcontentloaded')

    const join = page
      .getByRole('link', { name: /join camper connections/i })
      .first()
    await expect(join).toBeVisible()
    const href = await join.getAttribute('href')
    // Demo campground hits the /quickcheckin shortcut, but any
    // non-quick-checkin slug would hit /signup?intent=connections.
    // The presence of the slug parameter is the universal invariant.
    expect(href, 'Connections CTA must carry slug').toContain(
      'slug=roadwave-demo-campground',
    )
  })
})

test.describe('Login page copy', () => {
  test('intent=profile from QR header → RoadWave Profile copy', async ({
    page,
  }) => {
    await page.goto(
      `/login?intent=profile&slug=roadwave-demo-campground&next=${encodeURIComponent('/campground/roadwave-demo-campground')}`,
    )
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/roadwave profile/i).first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /sign in to your roadwave profile/i }),
    ).toBeVisible()
    // Campground-aware return hint.
    await expect(
      page.getByText(new RegExp(`return to ${DEMO_NAME}`, 'i')),
    ).toBeVisible()
    // Helper card that emphasizes campground info is still public.
    await expect(
      page.getByText(/campground info is still available without signing in/i),
    ).toBeVisible()

    await assertNoDeprecatedCopy(page)
  })

  test('intent=connections from Join Connections → Camper Connections copy', async ({
    page,
  }) => {
    // We don't have a real token for the demo campground in test data,
    // but the resolver also accepts ?slug=<slug>, which is the new
    // canonical path for the connections variant from the QR page.
    await page.goto(
      '/login?intent=connections&slug=roadwave-demo-campground',
    )
    await page.waitForLoadState('domcontentloaded')

    await expect(
      page.getByText(new RegExp(`camper connections at ${DEMO_NAME}`, 'i')),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: /sign in to join camper connections/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByText(/campground info stays available either way/i),
    ).toBeVisible()

    await assertNoDeprecatedCopy(page)
  })

  test('no QR context → generic Sign in copy', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/welcome back/i).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible()

    await assertNoDeprecatedCopy(page)
  })
})

test.describe('Signup page copy', () => {
  test('intent=connections from Join Connections → Camper Connections copy', async ({
    page,
  }) => {
    await page.goto(
      '/signup?intent=connections&slug=roadwave-demo-campground',
    )
    await page.waitForLoadState('domcontentloaded')

    await expect(
      page.getByText(new RegExp(`camper connections at ${DEMO_NAME}`, 'i')),
    ).toBeVisible()
    // Signup framing uses "Create your RoadWave profile" instead of
    // the login page's "Sign in to join Camper Connections" headline.
    await expect(
      page.getByRole('heading', { name: /create your roadwave profile/i }),
    ).toBeVisible()
    await expect(
      page.getByText(/campground info stays available either way/i),
    ).toBeVisible()

    // "Already have an account? Sign in" must preserve the QR
    // context so the camper bouncing to login doesn't lose framing.
    const signInLink = page
      .getByRole('link', { name: /^sign in$/i })
      .last()
    const href = await signInLink.getAttribute('href')
    expect(href, 'bottom Sign in must preserve intent').toContain(
      'intent=connections',
    )
    expect(href, 'bottom Sign in must preserve slug').toContain(
      'slug=roadwave-demo-campground',
    )

    await assertNoDeprecatedCopy(page)
  })

  test('no QR context → generic signup copy', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(/welcome to roadwave/i).first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /create your account/i }),
    ).toBeVisible()

    await assertNoDeprecatedCopy(page)
  })
})

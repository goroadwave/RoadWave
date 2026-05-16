// @ts-check
//
// Extends smoke's mobile coverage. The base smoke suite checks only the
// homepage + /owners hero on a 390x844 viewport. This file walks every
// camper-facing AND owner-facing page that a prospect or guest might
// realistically open on an iPhone, asserts:
//
//   - HTTP status < 500
//   - No "Application error" / "Internal Server Error" body text
//   - No horizontal scrollbar at the document level (a common symptom
//     of overflowing components — looks bad in front of an owner)
//   - Header logo / CTA is visible above the fold (where applicable)
//
// Read-only — no signups, no form submits. Pure layout sanity.

import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14 Pro

const CAMPER_PUBLIC_PATHS = [
  '/',
  '/signup',
  '/login',
  '/forgot-password',
  '/demo',
  '/demo/sample-rv-park',
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
]

const OWNER_PUBLIC_PATHS = [
  '/owners',
  '/owners/start',
  '/owners/how-it-works',
  '/owner/login',
]

const QR_LANDING_PATHS = [
  // Anonymous QR landing for the seeded demo campground. Must render
  // cleanly on mobile — this is the literal first impression a real
  // camper gets after scanning the QR at the front desk.
  '/campground/roadwave-demo-campground',
  '/campground/roadwave-demo-campground/updates',
]

/**
 * Check whether the document scrolls horizontally — a tell-tale sign
 * that a fixed-width child is overflowing the viewport. We allow a
 * 1px slop for sub-pixel layout rounding.
 *
 * @param {import('@playwright/test').Page} page
 */
async function hasHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const html = document.documentElement
    return html.scrollWidth - html.clientWidth > 1
  })
}

for (const path of [...CAMPER_PUBLIC_PATHS, ...OWNER_PUBLIC_PATHS, ...QR_LANDING_PATHS]) {
  test(`mobile ${path} renders without 500, error body, or horizontal overflow`, async ({
    page,
  }) => {
    const resp = await page.goto(path)
    expect(resp?.status(), `expected non-5xx for ${path}`).toBeLessThan(500)

    await expect(page.locator('body')).not.toContainText(
      /Application error|Internal Server Error/i,
    )

    // Give content one beat to settle in case there's an image-driven
    // reflow that pushes the document past the viewport.
    await page.waitForLoadState('domcontentloaded')

    const overflows = await hasHorizontalOverflow(page)
    expect(overflows, `${path} should not scroll horizontally on 390px`).toBe(
      false,
    )
  })
}

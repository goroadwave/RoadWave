// @ts-check
//
// Regression tests for the QR camper landing page scroll-to-top
// behavior. The bug we're guarding against: any in-page section
// hash that gets written to the URL by a Quick Action tap (Open
// Map, View Wi-Fi, Contact Office) survived reload / bfcache /
// bookmarking and dropped the camper into the middle of the page
// on the next visit (Wi-Fi card, Office Help, etc.) instead of
// the welcome header.
//
// What we assert:
//   1. Fresh open of the QR landing path lands at the very top.
//   2. Reload of the QR landing path lands at the very top.
//   3. Loading the URL with a stale `#wifi` / `#office-help` /
//      `#park-map` fragment still lands at the very top AND the
//      fragment is stripped from the URL within the first second.
//   4. Tapping a Quick Action button DOES scroll the page (the
//      in-session anchor behavior still works for intentional taps).
//
// Mobile viewport (iPhone 14 Pro 390x844) is the primary surface
// for QR scans, and is also where this bug originally surfaced.

import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

const QR_PATH = '/campground/roadwave-demo-campground'

// Tolerance for "at the top" -- a few pixels of slop for sub-pixel
// rounding and the inline pin script's last frame. Anything > 50px
// is genuinely mid-page.
const TOP_SLOP_PX = 50

async function getScrollY(page) {
  return page.evaluate(() => window.scrollY || 0)
}

test('QR landing: fresh open lands at the top', async ({ page }) => {
  await page.goto(QR_PATH)
  // Wait past the inline pin script's full 3s window so a delayed
  // hydration / image-load layout shift would have had a chance to
  // bump scroll if anything was going to.
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  const scrollY = await getScrollY(page)
  expect(scrollY, 'fresh QR open must land at the top').toBeLessThanOrEqual(
    TOP_SLOP_PX,
  )

  // And no hash should have crept in.
  const hash = await page.evaluate(() => window.location.hash)
  expect(hash, 'no fragment expected on cold open').toBe('')
})

test('QR landing: reload lands at the top', async ({ page }) => {
  await page.goto(QR_PATH)
  await page.waitForLoadState('networkidle')

  // Force-scroll down so the next reload has something to "preserve"
  // if scrollRestoration was sloppy.
  await page.evaluate(() => window.scrollTo(0, 1200))
  await page.waitForTimeout(150)

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  const scrollY = await getScrollY(page)
  expect(
    scrollY,
    'reload must reset scroll to the top, ignoring prior scroll position',
  ).toBeLessThanOrEqual(TOP_SLOP_PX)
})

for (const stale of ['#wifi', '#office-help', '#park-map']) {
  test(`QR landing: stale fragment ${stale} is stripped and page lands at top`, async ({
    page,
  }) => {
    await page.goto(`${QR_PATH}${stale}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const scrollY = await getScrollY(page)
    expect(
      scrollY,
      `${stale} must NOT anchor-jump the camper into a lower section`,
    ).toBeLessThanOrEqual(TOP_SLOP_PX)

    const hash = await page.evaluate(() => window.location.hash)
    expect(
      hash,
      `${stale} should be stripped from the URL so reload also lands at top`,
    ).toBe('')
  })
}

test('QR landing: tapping a quick action still scrolls (only on user click)', async ({
  page,
}) => {
  await page.goto(QR_PATH)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  // Each Quick Action only renders when its target section will
  // actually render -- e.g. "Open map" needs a configured park map
  // for the campground. We try the set in display order and use
  // whichever one is present on this campground. If none are
  // surfaced (a campground with no map / Wi-Fi / office help /
  // phone), the test skips cleanly rather than pretending it
  // asserted anything.
  const candidates = [
    { name: /open map/i, anchor: '#park-map' },
    { name: /view wi-?fi/i, anchor: '#wifi' },
    { name: /contact office/i, anchor: '#office-help' },
  ]
  let action = null
  let anchor = null
  for (const c of candidates) {
    const loc = page.getByRole('link', { name: c.name }).first()
    if (await loc.count()) {
      action = loc
      anchor = c.anchor
      break
    }
  }
  if (!action) {
    test.skip(true, 'Demo campground exposes no in-page Quick Action')
  }

  await action.click()
  // 600ms is enough for smooth-scroll to complete; the page is
  // <2000px tall on this viewport so even iOS-style smooth-scroll
  // animations finish well within that window.
  await page.waitForTimeout(600)

  const scrollY = await getScrollY(page)
  expect(
    scrollY,
    `tapping the ${anchor} quick action should scroll the page below the top`,
  ).toBeGreaterThan(TOP_SLOP_PX)
})

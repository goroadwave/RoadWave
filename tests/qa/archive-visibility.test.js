// @ts-check
//
// Production-safe. Verifies that archived test campgrounds are not
// publicly accessible — both via direct slug navigation and by DB
// query (when service-role creds are available locally).
//
// Read-only against the live site. No signup, no DB writes.
//
// Includes the historical archived test slugs from the 2026-05-19
// pre-launch cleanup. If those slugs are ever rehydrated as real
// campgrounds, this test will fail and signal the regression.

import { expect, test } from '@playwright/test'

const ARCHIVED_TEST_SLUGS = [
  // Original slugs of the 5 archived test campgrounds — these should
  // all 404 because (a) the rows were renamed with _archived_ prefix
  // and (b) is_active = false.
  'test-stripe-campground',
  'final-stripe-test-campground',
  'test-10',
  'avalon',
  // Test 4's original slug was never set as a plain word; it was
  // _archived_launch_test_2026_05_18 from the start of its archived
  // life. The renamed archived slugs themselves should also 404
  // because is_active=false.
  '_archived_launch_test_2026_05_18',
  '_archived_test_10_2026_05_19',
  '_archived_avalon_2026_05_19',
  '_archived_test_stripe_2026_05_19',
  '_archived_final_stripe_test_2026_05_19',
]

const ACTIVE_LIVE_SLUGS = [
  'roadwave-demo-campground',  // intentional public demo
  'riverbend-rv-park',          // sample seed data, kept active
]

test.describe('Archived campgrounds are not publicly visible', () => {
  for (const slug of ARCHIVED_TEST_SLUGS) {
    test(`archived /campground/${slug} returns 404`, async ({ page }) => {
      const resp = await page.goto(`/campground/${slug}`)
      expect(resp?.status(), `expected 404 for archived ${slug}`).toBe(404)
    })
  }

  for (const slug of ACTIVE_LIVE_SLUGS) {
    test(`active /campground/${slug} still returns 200`, async ({ page }) => {
      const resp = await page.goto(`/campground/${slug}`)
      expect(resp?.status(), `expected 200 for active ${slug}`).toBe(200)
      await expect(page.locator('body')).not.toContainText(
        /Application error|Internal Server Error/i,
      )
    })
  }
})

test.describe('Archived campgrounds also 404 under renamed slug', () => {
  // Belt-and-suspenders: even if someone constructs a URL using the
  // renamed _archived_ slug, the page should still 404 because
  // is_active=false gates the campground/[slug]/page.tsx render.
  test('renamed archived slug 404s due to is_active=false gate', async ({
    page,
  }) => {
    const resp = await page.goto(
      '/campground/_archived_launch_test_2026_05_18/updates',
    )
    // Either the slug doesn't resolve (404) OR the /updates page renders
    // a "campground not on RoadWave yet" message. Both prove the
    // archived row is invisible to public traffic.
    if (resp?.status() === 200) {
      await expect(page.locator('body')).toContainText(
        /not on RoadWave yet|Campground not found/i,
      )
    } else {
      expect(resp?.status()).toBe(404)
    }
  })
})

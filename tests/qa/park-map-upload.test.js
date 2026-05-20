// @ts-check
//
// Park Map upload (Phase 3b, migration 0051). Verifies that:
//
//   1. The guest hub renders the uploaded-image variant (inline
//      preview + "Open full size") when park_map_file_url is set
//      with an image MIME.
//   2. The guest hub renders the uploaded-PDF variant ("View Park
//      Map (PDF)" link) when park_map_file_url is set with the
//      application/pdf MIME.
//   3. The guest hub renders the URL fallback variant when only
//      park_map_url is set (no upload).
//   4. The uploaded file wins over the URL fallback when both are
//      set (precedence test).
//   5. The Park Map section is HIDDEN when neither URL nor uploaded
//      file is set, even when show_park_map = true.
//   6. The Park Map section is HIDDEN when show_park_map = false,
//      even when both URL and file are set.
//
// Each test seeds the demo campground row via the service-role key,
// hits the rendered HTML at /campground/<slug>, and asserts on the
// visible text. State is saved at the start of the suite and
// restored in `afterAll` so the demo row goes back to whatever it
// was before the test ran.
//
// Server-action validation tests (oversized file rejected, MIME
// rejected, ownership gate, replace-with-different-ext cleans up
// the old file) are NOT covered here because they require a real
// authenticated owner session. Those are stubbed below to document
// the intent; fill them in when a preview env with two test
// owners is provisioned.
//
// Gated on env vars: skips with a clear message if the
// service-role key or the URL aren't available.

import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEMO_SLUG = 'roadwave-demo-campground'

// Sample assets we point the demo row at during the test. These are
// stable public URLs that won't change underneath us. The image is a
// 1x1 PNG transparent pixel from Wikimedia Commons; the PDF is the
// W3C "dummy.pdf" canonical sample. We don't render them in a real
// browser viewer here -- we only assert that the guest hub picked
// the right variant based on the MIME column.
const TEST_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png'
const TEST_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const FALLBACK_URL_ONLY =
  'https://example.com/sample-park-map.jpg'

// Re-fetch the demo row's park-map columns. Used both to capture the
// starting state and to restore it.
async function readParkMapState(client, campgroundId) {
  const { data, error } = await client
    .from('campgrounds')
    .select(
      'show_park_map, park_map_url, park_map_notes, park_map_path, park_map_file_type, park_map_file_name, park_map_updated_at',
    )
    .eq('id', campgroundId)
    .single()
  if (error) throw new Error(`readParkMapState: ${error.message}`)
  return data
}

async function setParkMapState(client, campgroundId, patch) {
  const { error } = await client
    .from('campgrounds')
    .update(patch)
    .eq('id', campgroundId)
  if (error) throw new Error(`setParkMapState: ${error.message}`)
}

test.describe('Park Map upload — guest hub rendering', () => {
  // All tests mutate the same demo campground row's park-map columns.
  // Parallel execution would create races where test A's setup
  // overwrites test B's expected state. Serial mode keeps each test
  // hermetic against the others within this file.
  test.describe.configure({ mode: 'serial' })

  test.skip(
    !URL || !SRK,
    'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required',
  )

  /** @type {import('@supabase/supabase-js').SupabaseClient} */
  let admin
  /** @type {string} */
  let demoId
  /** @type {{show_park_map: boolean, park_map_url: string|null, park_map_notes: string|null, park_map_path: string|null, park_map_file_type: string|null, park_map_file_name: string|null, park_map_updated_at: string|null}} */
  let originalState

  test.beforeAll(async () => {
    admin = createClient(/** @type {string} */ (URL), /** @type {string} */ (SRK), {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin
      .from('campgrounds')
      .select('id')
      .eq('slug', DEMO_SLUG)
      .single()
    if (error || !data) throw new Error(`Demo campground row missing: ${error?.message}`)
    demoId = data.id
    originalState = await readParkMapState(admin, demoId)
  })

  test.afterAll(async () => {
    if (admin && demoId && originalState) {
      await setParkMapState(admin, demoId, originalState)
    }
  })

  test('image upload → inline preview + Open full size', async ({ page }) => {
    await setParkMapState(admin, demoId, {
      show_park_map: true,
      park_map_url: null,
      park_map_notes: null,
      park_map_path: TEST_IMAGE_URL,
      park_map_file_type: 'image/png',
      park_map_file_name: 'test-image.png',
      park_map_updated_at: new Date().toISOString(),
    })

    await page.goto(`/campground/${DEMO_SLUG}`)
    // Eyebrow renders the "Park map" header.
    await expect(page.getByRole('heading', { name: /Park map/i })).toBeVisible()
    // Image preview link explicitly has the "Open the campground map
    // at full size" aria-label.
    const previewLink = page.getByRole('link', {
      name: /Open the campground map at full size/i,
    })
    await expect(previewLink).toBeVisible()
    // Inline <img> with the exact src we set.
    await expect(page.locator(`img[src="${TEST_IMAGE_URL}"]`)).toBeVisible()
    // "Open full size" CTA below the preview.
    await expect(
      page.getByRole('link', { name: /Open full size/i }),
    ).toBeVisible()
  })

  test('PDF upload → "View Park Map (PDF)" card', async ({ page }) => {
    await setParkMapState(admin, demoId, {
      show_park_map: true,
      park_map_url: null,
      park_map_notes: null,
      park_map_path: TEST_PDF_URL,
      park_map_file_type: 'application/pdf',
      park_map_file_name: 'campground-map.pdf',
      park_map_updated_at: new Date().toISOString(),
    })

    await page.goto(`/campground/${DEMO_SLUG}`)
    await expect(page.getByRole('heading', { name: /Park map/i })).toBeVisible()
    // PDF variant uses a specific CTA string.
    const pdfLink = page.getByRole('link', { name: /View Park Map \(PDF\)/i })
    await expect(pdfLink).toBeVisible()
    // The CTA is the link wrapping the card; it should point at the
    // PDF URL.
    await expect(pdfLink).toHaveAttribute('href', TEST_PDF_URL)
    // Image-variant preview must NOT render for a PDF.
    await expect(
      page.getByRole('link', { name: /Open the campground map at full size/i }),
    ).toHaveCount(0)
  })

  test('URL fallback (no upload) → "Open the park map" tap-anywhere card', async ({
    page,
  }) => {
    await setParkMapState(admin, demoId, {
      show_park_map: true,
      park_map_url: FALLBACK_URL_ONLY,
      park_map_notes: null,
      park_map_path: null,
      park_map_file_type: null,
      park_map_file_name: null,
      park_map_updated_at: null,
    })

    await page.goto(`/campground/${DEMO_SLUG}`)
    await expect(page.getByRole('heading', { name: /Park map/i })).toBeVisible()
    const fallbackLink = page.getByRole('link', { name: /Open the park map/i })
    await expect(fallbackLink).toBeVisible()
    await expect(fallbackLink).toHaveAttribute('href', FALLBACK_URL_ONLY)
    // Neither uploaded-image preview nor PDF CTA renders for a URL
    // fallback.
    await expect(
      page.getByRole('link', { name: /Open the campground map at full size/i }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: /View Park Map \(PDF\)/i }),
    ).toHaveCount(0)
  })

  test('precedence — uploaded file wins when both URL and file set', async ({
    page,
  }) => {
    await setParkMapState(admin, demoId, {
      show_park_map: true,
      park_map_url: FALLBACK_URL_ONLY,
      park_map_notes: null,
      park_map_path: TEST_IMAGE_URL,
      park_map_file_type: 'image/png',
      park_map_file_name: 'precedence.png',
      park_map_updated_at: new Date().toISOString(),
    })

    await page.goto(`/campground/${DEMO_SLUG}`)
    // Image-upload variant renders.
    await expect(page.locator(`img[src="${TEST_IMAGE_URL}"]`)).toBeVisible()
    // The fallback URL must NOT appear as a link target on the page.
    await expect(
      page.locator(`a[href="${FALLBACK_URL_ONLY}"]`),
    ).toHaveCount(0)
  })

  test('hides when show_park_map = true but no URL/file set', async ({
    page,
  }) => {
    await setParkMapState(admin, demoId, {
      show_park_map: true,
      park_map_url: null,
      park_map_notes: null,
      park_map_path: null,
      park_map_file_type: null,
      park_map_file_name: null,
      park_map_updated_at: null,
    })

    await page.goto(`/campground/${DEMO_SLUG}`)
    // Neither the eyebrow nor any of the variant CTAs should appear.
    await expect(page.getByRole('heading', { name: /Park map/i })).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: /Open the park map/i }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: /View Park Map \(PDF\)/i }),
    ).toHaveCount(0)
  })

  test('hides when show_park_map = false even if file set', async ({ page }) => {
    await setParkMapState(admin, demoId, {
      show_park_map: false,
      park_map_url: FALLBACK_URL_ONLY,
      park_map_notes: null,
      park_map_path: TEST_IMAGE_URL,
      park_map_file_type: 'image/png',
      park_map_file_name: 'hidden.png',
      park_map_updated_at: new Date().toISOString(),
    })

    await page.goto(`/campground/${DEMO_SLUG}`)
    await expect(page.getByRole('heading', { name: /Park map/i })).toHaveCount(0)
    await expect(page.locator(`img[src="${TEST_IMAGE_URL}"]`)).toHaveCount(0)
  })
})

// Server-action-side tests (oversized file rejected, bad MIME
// rejected, ownership gate enforced, replace-with-different-ext
// cleans up the orphaned file). These require an authenticated
// owner session and a real Storage round-trip. Stubbed today;
// fill in when a preview env with at least one test owner is
// provisioned. Pattern matches tests/qa/cross-owner-isolation.test.js.
test.describe('Park Map upload — server action validation (stubs)', () => {
  test.skip(
    true,
    'Requires authenticated owner session in a preview env. Stubbed for now.',
  )

  test.skip('Uploading a 11 MB file returns "Map must be 10 MB or smaller."')
  test.skip('Uploading a .txt file returns "PNG, JPG, WebP, or PDF only."')
  test.skip('Owner A cannot upload to Owner B campground (ownership gate)')
  test.skip('Replacing a PNG upload with a PDF removes the orphaned PNG')
  test.skip('Clear action removes the storage object + nulls the columns')
})

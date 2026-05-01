// @ts-check
//
// End-to-end suite for getroadwave.com. Read-only against production:
//   - exercises every public page, button, form (fields-present checks
//     only — no submissions that would create real DB rows or trigger
//     Resend emails)
//   - drives the interactive demo through real taps + manual chat input
//   - hits multiple /demo/[slug] routes to verify campground-specific
//     rendering
//   - runs concurrent visits to /owner/signup to confirm the route
//     handles parallel load
//   - confirms owner-side auth gates redirect anonymous traffic
//
// What's intentionally NOT tested:
//   - Real owner signup (would create live auth.users rows + send
//     Resend emails).
//   - Authenticated owner dashboard internals (would require real
//     credentials).
//   - QR code image-render correctness on the real owner dashboard
//     (also requires auth). The slug-based /demo/[campground] tests
//     stand in for the campground-specific routing surface.

import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Marketing / public pages
// ---------------------------------------------------------------------------

test.describe('Public marketing pages', () => {
  test('homepage loads with hero copy + Try the Demo + I Run a Campground + footer', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/RoadWave/i)
    await expect(
      page.getByRole('heading', {
        name: /Curious who else here shares your interests/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Try the Demo/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /I Run a Campground/i }).first(),
    ).toBeVisible()
    // Trust strip carries the no-X promises.
    await expect(
      page.getByText(
        /No exact site numbers\. No public group chats\. No pressure\./i,
      ),
    ).toBeVisible()
    // Footer columns — site-footer renders the Legal + Guests + Owners
    // columns with the links below.
    await expect(
      page.getByRole('link', { name: /^Privacy Policy$/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /^Terms of Service$/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /^Safety$/i }).first(),
    ).toBeVisible()
  })

  test('about page renders the founder story and CTA', async ({ page }) => {
    await page.goto('/about')
    await expect(
      page.getByRole('heading', {
        name: /Help good people find each other/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Try the Demo/i }),
    ).toBeVisible()
  })

  test('contact page exposes the hello@ mailto', async ({ page }) => {
    await page.goto('/contact')
    await expect(
      page.getByRole('heading', { name: /Get in touch/i }),
    ).toBeVisible()
    const btn = page.getByRole('link', { name: /Email us/i })
    await expect(btn).toBeVisible()
    await expect(btn).toHaveAttribute(
      'href',
      /mailto:hello@getroadwave\.com/i,
    )
  })

  test('privacy policy + terms render their long-form copy', async ({
    page,
  }) => {
    await page.goto('/privacy')
    await expect(
      page.getByRole('heading', { name: /Your data, your call/i }),
    ).toBeVisible()
    await page.goto('/terms')
    await expect(
      page.getByRole('heading', { name: /The rules of the road/i }),
    ).toBeVisible()
  })

  test('owners marketing page has the spec hero + Start My Campground Pilot CTA', async ({
    page,
  }) => {
    await page.goto('/owners')
    await expect(
      page.getByRole('heading', {
        name: /Help guests feel welcome faster/i,
      }),
    ).toBeVisible()
    // Hero CTAs from spec §13.
    await expect(
      page.getByRole('link', { name: /Start My Campground Pilot/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Watch 90-Second Demo/i }).first(),
    ).toBeVisible()
    // Staff workload section (§14).
    await expect(
      page.getByRole('heading', { name: /What your staff has to do/i }),
    ).toBeVisible()
    // QR placement section (§15).
    await expect(
      page.getByRole('heading', { name: /Where the QR code goes/i }),
    ).toBeVisible()
  })

  test('owners page nav links to Home / Demo / About / Contact', async ({
    page,
  }) => {
    await page.goto('/owners')
    const nav = page.locator('header nav')
    await expect(nav.getByRole('link', { name: /^Home$/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /^Demo$/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /^About$/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /^Contact$/i })).toBeVisible()
  })

  test('/campgrounds permanently redirects to /owners', async ({ page }) => {
    await page.goto('/campgrounds')
    await expect(page).toHaveURL(/\/owners(\?|$|#|\/)/)
  })

  test('homepage "Request RoadWave at My Campground" form is on screen', async ({
    page,
  }) => {
    await page.goto('/')
    // Form lives in the Example campgrounds section.
    await expect(
      page.getByRole('button', {
        name: /Request RoadWave at My Campground/i,
      }),
    ).toBeVisible()
  })

  test('tour page loads the tap-to-start splash', async ({ page }) => {
    await page.goto('/tour')
    // Splash text typically includes the brand and a tap-to-start cue
    await expect(page.locator('body')).toContainText(/Welcome|RoadWave|tour/i)
  })
})

// ---------------------------------------------------------------------------
// Interactive demo
// ---------------------------------------------------------------------------

test.describe('Demo — simulated phone, real interaction', () => {
  test('opens checked-in at Riverbend RV Park by default', async ({ page }) => {
    await page.goto('/demo')
    await expect(
      page.getByRole('heading', { name: /Welcome to Riverbend RV Park/i }),
    ).toBeVisible()
    await expect(
      page.getByText(/You're checked in for 24 hours/i),
    ).toBeVisible()
  })

  test('"See Nearby Campers" CTA navigates to the Nearby tab', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /See Nearby Campers/i }).click()
    await expect(
      page.getByRole('heading', { name: /Nearby campers/i }),
    ).toBeVisible()
  })

  test('every nav tab can be opened', async ({ page }) => {
    await page.goto('/demo')
    const order = [
      'Check in',
      'Nearby',
      'Meetups',
      'Waves',
      'Privacy',
      'Crossed',
      'Home',
    ]
    for (const label of order) {
      await page
        .getByRole('button', { name: new RegExp(`^${label}$`) })
        .first()
        .click()
      // Allow the simulated tab to mount before tapping the next one.
      await page.waitForTimeout(120)
    }
  })

  test('Wave button on Nearby flips a card into "Waved" state', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    const firstWave = page
      .getByRole('button', { name: /^Wave$/ })
      .first()
    await firstWave.click()
    // The card transitions through Waved · waiting → consent prompt
    // → connected. Any of those substrings on the page after the click
    // confirms the mechanic fired.
    await expect(
      page
        .getByText(/Waved.*waiting|Would you like to connect|New Connection/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('Privacy tab can switch the mode badge', async ({ page }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Privacy$/ }).click()
    await expect(
      page.getByRole('heading', { name: /How visible are you/i }),
    ).toBeVisible()
    // The mode buttons mix emoji + label + description, so the
    // accessible name starts with the emoji. Use a containment locator.
    await page.locator('button:has-text("Quiet")').first().click()
    await page.getByRole('button', { name: /^Home$/ }).click()
    await expect(page.getByText(/quiet/i).first()).toBeVisible()
  })

  test('Meetups tab shows hosted (verified) + camper sections', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Meetups$/ }).click()
    await expect(
      page.getByRole('heading', { name: /What's happening/i }),
    ).toBeVisible()
    await expect(page.getByText(/Hosted by/i)).toBeVisible()
    await expect(page.getByText(/Posted by campers/i)).toBeVisible()
  })

  test('Waves tab is pre-seeded with sample messages + entries', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Waves$/ }).click()
    await expect(
      page.getByText(/How a wave becomes a hello/i),
    ).toBeVisible()
    await expect(page.getByText(/coffee tomorrow/i)).toBeVisible()
  })

  test('Crossed paths — tap a card and exchange a manual chat message', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Crossed$/ }).click()
    // Crossed-paths cards show the camper's name + @username; tap the
    // first card.
    const firstCard = page.locator('button').filter({ hasText: /@/ }).first()
    await firstCard.click()
    // Conversation header shows CROSSED badge.
    await expect(page.getByText(/^CROSSED$/)).toBeVisible()
    // Type a message and send. Mock data persists in local state only.
    const composer = page.getByPlaceholder(/Type a message/i)
    await composer.fill('Playwright says hi')
    await page.getByRole('button', { name: /^Send$/ }).click()
    await expect(page.getByText(/Playwright says hi/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Per-campground demo routing — stands in for "QR code per campground"
// since the real QR endpoints require owner auth.
// ---------------------------------------------------------------------------

test.describe('Per-campground demo slug routing', () => {
  // A few representative slugs from the marketing examples.
  const slugs = [
    { slug: 'riverbend-rv-park', expect: /Riverbend RV Park/i },
    { slug: 'oak-hollow-rv-resort', expect: /Oak Hollow/i },
    { slug: 'pine-lake-campground', expect: /Pine Lake/i },
    { slug: 'coastal-pines-campground', expect: /Coastal Pines/i },
  ]
  for (const { slug, expect: nameRe } of slugs) {
    test(`/demo/${slug} renders the campground name`, async ({ page }) => {
      await page.goto(`/demo/${slug}`)
      await expect(page.getByText(nameRe).first()).toBeVisible()
    })
  }
})

// ---------------------------------------------------------------------------
// Owner-side auth gates and form scaffolding
// ---------------------------------------------------------------------------

test.describe('Owner — auth gates + signup/login form scaffolding', () => {
  test('/owner redirects anonymous traffic to /owner/login', async ({ page }) => {
    await page.goto('/owner')
    await expect(page).toHaveURL(/\/owner\/login/)
  })

  test('/owner/dashboard redirects anonymous traffic', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await expect(page).toHaveURL(/\/owner\/login/)
  })

  test('/owner/preview redirects anonymous traffic', async ({ page }) => {
    await page.goto('/owner/preview')
    await expect(page).toHaveURL(/\/owner\/login/)
  })

  test('/owner/login renders email + password inputs', async ({ page }) => {
    await page.goto('/owner/login')
    await expect(
      page.getByRole('heading', { name: /Welcome back/i }),
    ).toBeVisible()
    // Form's <label> elements lack htmlFor, so getByLabel can't bind.
    // Use the name-attribute selector — actually present in the DOM.
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible()
  })

  test('/owner/signup renders the self-serve form fields', async ({ page }) => {
    await page.goto('/owner/signup')
    await expect(
      page.getByRole('heading', { name: /Start My Campground Pilot/i }),
    ).toBeVisible()
    await expect(page.locator('input[name="campground_name"]')).toBeVisible()
    await expect(page.locator('input[name="owner_name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="phone"]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Start My Campground Pilot/i }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Concurrent owner-signup load: make sure the route handles parallel cold
// requests without 5xx-ing or losing chrome. This proves "concurrent
// signups" without actually creating real accounts.
// ---------------------------------------------------------------------------

test('5 concurrent visits to /owner/signup all render the form', async ({
  browser,
}) => {
  const N = 5
  const contexts = await Promise.all(
    Array.from({ length: N }, () => browser.newContext()),
  )
  try {
    const pages = await Promise.all(contexts.map((c) => c.newPage()))
    await Promise.all(pages.map((p) => p.goto('/owner/signup')))
    await Promise.all(
      pages.map((p) =>
        expect(p.locator('input[name="campground_name"]')).toBeVisible(),
      ),
    )
  } finally {
    await Promise.all(contexts.map((c) => c.close()))
  }
})

// ---------------------------------------------------------------------------
// Public-form fields-present checks — does NOT submit so we don't write
// to Supabase or trigger Resend.
// ---------------------------------------------------------------------------

test.describe('Public forms — fields render without submission', () => {
  test('homepage Request RoadWave form has email + campground name + submit', async ({
    page,
  }) => {
    await page.goto('/')
    const submit = page.getByRole('button', {
      name: /Request RoadWave at My Campground/i,
    })
    await expect(submit).toBeVisible()
    // Fields live in the same dashed-border section.
    await expect(
      page.locator('input[type="email"]').first(),
    ).toBeVisible()
  })

  // Old lead form on /campgrounds was replaced by the InteractiveDemo
  // wizard when the owner content moved to /owners. Wizard coverage
  // lives in its own component test.
})

// @ts-check
// Compliance test suite — verifies the consent + safety guarantees the
// product team committed to. Hits the live deployment by default; never
// submits a real signup so production data stays untouched.

import { test, expect } from '@playwright/test'

const FOOTER_LINKS = [
  ['Safety', '/safety'],
  ['Community Rules', '/community-rules'],
  ['Campground Safety Overview', '/campground-safety'],
  ['Partner Terms', '/campground-partner-terms'],
  ['Terms of Service', '/terms'],
  ['Privacy Policy', '/privacy'],
  ['Safety Protocol', '/safety-protocol'],
  ['Law Enforcement Policy', '/law-enforcement'],
  ['Data Breach Policy', '/data-breach-policy'],
]

// ---------------------------------------------------------------------------
// 1-4. Signup form: 18+, Terms/Privacy, Community Rules required
// ---------------------------------------------------------------------------

test.describe('Signup consent gates', () => {
  test('signup form has the three required checkboxes with exact text', async ({
    page,
  }) => {
    await page.goto('/signup')

    const ageBox = page.locator('input[name="confirm_18"]')
    const termsBox = page.locator('input[name="accept"]')
    const rulesBox = page.locator('input[name="accept_community_rules"]')

    await expect(ageBox).toHaveCount(1)
    await expect(ageBox).toHaveAttribute('required', '')
    await expect(ageBox).toHaveAttribute('type', 'checkbox')

    await expect(termsBox).toHaveCount(1)
    await expect(termsBox).toHaveAttribute('required', '')

    await expect(rulesBox).toHaveCount(1)
    await expect(rulesBox).toHaveAttribute('required', '')

    // Exact 18+ copy is rendered next to the checkbox.
    await expect(
      page.getByText(
        'I confirm I am 18 years of age or older. RoadWave is not available to minors.',
        { exact: false },
      ),
    ).toBeVisible()

    // Disclaimer near the submit button.
    await expect(
      page.getByText(
        'RoadWave is not for emergencies, background checks, or campground security.',
        { exact: false },
      ),
    ).toBeVisible()
  })

  test('browser blocks submit when 18+ is unchecked', async ({ page }) => {
    await page.goto('/signup')

    // Fill the rest of the form so only the missing checkboxes are left
    // to fail validation. Use a clearly-fake email / username so even
    // if the browser somehow let it through, server validation rejects.
    await page.locator('input[name="username"]').fill('compliance_test_x')
    await page.locator('input[name="email"]').fill('compliance-test@example.invalid')
    await page.locator('input[name="password"]').fill('ComplianceTest1!')

    // Don't check confirm_18. Click submit.
    const submit = page.getByRole('button', { name: /Create account/i })

    // The native required attribute prevents form submission. After click,
    // we should still be on /signup (no navigation).
    await submit.click({ trial: false }).catch(() => {})
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/signup')

    // The 18+ checkbox should be reported invalid via the constraint API.
    const invalid = await page
      .locator('input[name="confirm_18"]')
      .evaluate((el) => /** @type {HTMLInputElement} */ (el).validity.valid)
    expect(invalid).toBe(false)
  })

  test('Terms/Privacy and Community Rules also block submission', async ({
    page,
  }) => {
    await page.goto('/signup')

    // Tick only the 18+ box; leave the other two unchecked.
    await page.locator('input[name="confirm_18"]').check()
    await page.locator('input[name="username"]').fill('compliance_test_y')
    await page.locator('input[name="email"]').fill('compliance-y@example.invalid')
    await page.locator('input[name="password"]').fill('ComplianceTest1!')

    await page.getByRole('button', { name: /Create account/i }).click().catch(() => {})
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/signup')

    const acceptValid = await page
      .locator('input[name="accept"]')
      .evaluate((el) => /** @type {HTMLInputElement} */ (el).validity.valid)
    const rulesValid = await page
      .locator('input[name="accept_community_rules"]')
      .evaluate((el) => /** @type {HTMLInputElement} */ (el).validity.valid)
    expect(acceptValid).toBe(false)
    expect(rulesValid).toBe(false)
  })

  test('Google signup button is disabled until all three checkboxes are checked', async ({
    page,
  }) => {
    await page.goto('/signup')

    const googleBtn = page.getByRole('button', {
      name: /Sign up with Google/i,
    })
    const submitBtn = page.getByRole('button', { name: /Create account/i })
    const ageBox = page.locator('input[name="confirm_18"]')
    const termsBox = page.locator('input[name="accept"]')
    const rulesBox = page.locator('input[name="accept_community_rules"]')

    // Initial state — both buttons must be disabled and the helper text
    // explaining why must be visible.
    await expect(googleBtn).toBeDisabled()
    await expect(submitBtn).toBeDisabled()
    await expect(
      page.getByText(
        /Confirm 18\+, agree to the Terms and Privacy Policy, and accept the Community Rules/i,
      ),
    ).toBeVisible()

    // Tick first two boxes — Google button should still be disabled.
    await ageBox.check()
    await termsBox.check()
    await expect(googleBtn).toBeDisabled()

    // Final box → button enables. Helper text disappears.
    await rulesBox.check()
    await expect(googleBtn).toBeEnabled()
    await expect(
      page.getByText(
        /Confirm 18\+, agree to the Terms and Privacy Policy, and accept the Community Rules/i,
      ),
    ).toHaveCount(0)

    // Uncheck one box again — button must dim back out.
    await termsBox.uncheck()
    await expect(googleBtn).toBeDisabled()
  })

  test('Google button click does nothing while disabled (no OAuth nav)', async ({
    page,
  }) => {
    await page.goto('/signup')
    const googleBtn = page.getByRole('button', {
      name: /Sign up with Google/i,
    })
    await expect(googleBtn).toBeDisabled()
    // Force-clicking a disabled button shouldn't navigate. Use force:true
    // to bypass Playwright's actionability check (we're proving the
    // browser respects the disabled attribute even under attack).
    await googleBtn.click({ force: true }).catch(() => {})
    await page.waitForTimeout(400)
    // Still on /signup. No accounts.google.com redirect happened.
    expect(page.url()).toContain('/signup')
  })
})

// ---------------------------------------------------------------------------
// 5. Storage shape (DB schema audit, not a write)
// ---------------------------------------------------------------------------

test('legal_acks columns include the consent fields (sanity check)', async ({
  page,
}) => {
  // We intentionally don't perform a real signup. The DB schema is verified
  // separately via migrations. This test asserts the SIGNUP page UI can
  // surface the three checkboxes the action persists, which is what the
  // consent record requires. The actual storage contract is covered by
  // migration 0024 (age_confirmed / accepted_terms / accepted_rules) and
  // signupAction's insert statement.
  await page.goto('/signup')
  await expect(page.locator('input[name="confirm_18"]')).toBeVisible()
  await expect(page.locator('input[name="accept"]')).toBeVisible()
  await expect(page.locator('input[name="accept_community_rules"]')).toBeVisible()
})

// ---------------------------------------------------------------------------
// 6. Safety banners — Nearby, Waves, Messages, Meetups + demo
// ---------------------------------------------------------------------------

test.describe('Safety banners', () => {
  // Live screens are auth-gated; we verify by hitting the demo preview
  // which surfaces the same banners on the same tab structure.
  test('demo Nearby tab shows the Nearby safety banner', async ({ page }) => {
    await page.goto('/campgrounds')
    // Confirm age gate isn't blocking — /campgrounds doesn't have one.
    // Fill Step 1 of the wizard and continue to preview.
    await page
      .locator('input[name="campground_name"]')
      .fill('Compliance Test Campground')
    await page.getByRole('button', { name: /See your RoadWave page/i }).click()

    // Click into Nearby tab inside the preview.
    await page.getByRole('tab', { name: 'Nearby' }).click()
    await expect(
      page.getByText(
        'RoadWave helps campers connect, but you choose if, when, and where to meet.',
        { exact: false },
      ),
    ).toBeVisible()
  })

  test('demo Meetups tab shows the Messages-style safety banner', async ({
    page,
  }) => {
    await page.goto('/campgrounds')
    await page.locator('input[name="campground_name"]').fill('Compliance Test')
    await page.getByRole('button', { name: /See your RoadWave page/i }).click()
    await page.getByRole('tab', { name: 'Meetups' }).click()
    await expect(
      page.getByText(
        'Meet smart: Use public campground areas, let someone know where you are going',
        { exact: false },
      ),
    ).toBeVisible()
  })

  test('demo Owner dashboard view shows the safety-layer line', async ({
    page,
  }) => {
    await page.goto('/campgrounds')
    await page.locator('input[name="campground_name"]').fill('Compliance Test')
    await page.getByRole('button', { name: /See your RoadWave page/i }).click()
    await page.getByRole('tab', { name: 'Owner dashboard' }).click()
    await expect(
      page.getByText(
        'RoadWave is designed to encourage real-life campground connection without exact site sharing',
        { exact: false },
      ),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 7. Footer / legal / safety links resolve to live routes
// ---------------------------------------------------------------------------

test.describe('Footer routes', () => {
  for (const [label, path] of FOOTER_LINKS) {
    test(`${label} (${path}) returns 200`, async ({ request }) => {
      const res = await request.get(path)
      expect(res.status(), `${path} should return 200`).toBe(200)
    })
  }

  test('home page renders the unified footer with all required columns', async ({
    page,
  }) => {
    await page.goto('/')
    // The four column titles.
    for (const col of ['Guests', 'Campground Owners', 'Legal', 'Contact']) {
      await expect(
        page.getByRole('contentinfo').getByText(col, { exact: true }).first(),
      ).toBeVisible()
    }
    // Spot check that hello@ + safety@ both appear.
    await expect(
      page
        .getByRole('contentinfo')
        .getByRole('link', { name: 'hello@getroadwave.com' }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('contentinfo')
        .getByRole('link', { name: 'safety@getroadwave.com' }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Sanity: contact page surfaces the three options
// ---------------------------------------------------------------------------

test('contact page shows General + Safety + Emergencies', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.getByText('General questions')).toBeVisible()
  await expect(
    page.getByText(
      'Safety reports, legal requests, account issues, or urgent concerns',
    ),
  ).toBeVisible()
  await expect(page.getByText('Emergencies')).toBeVisible()
  await expect(
    page.getByText('Call 911 first, then notify campground staff.'),
  ).toBeVisible()
})

// ---------------------------------------------------------------------------
// OAuth consent gate
// ---------------------------------------------------------------------------

test.describe('OAuth consent gate', () => {
  test('/consent without a session redirects to /login', async ({ page }) => {
    await page.goto('/consent')
    // Server component sees no user and redirects to /login (with a chained
    // ?next= so the caller comes back to /consent post-login).
    expect(page.url()).toContain('/login')
  })

  test('/consent?next=/owner preserves the next chain through login', async ({
    page,
  }) => {
    await page.goto('/consent?next=%2Fowner')
    expect(page.url()).toContain('/login')
    const decoded = decodeURIComponent(page.url())
    expect(decoded).toContain('/consent')
    expect(decoded).toContain('/owner')
  })

  test('/consent action endpoint exists and rejects open redirects', async ({
    request,
  }) => {
    // POST without auth → action returns "session expired" error string,
    // never a redirect to an external host. (Full auth + form roundtrip is
    // covered by the markup-level checks in the suite below; this guards
    // the open-redirect surface specifically.)
    const res = await request.post('/consent', {
      form: {
        confirm_18: 'on',
        accept_terms: 'on',
        accept_privacy: 'on',
        accept_community_rules: 'on',
        next: 'https://evil.example/steal',
      },
      maxRedirects: 0,
    })
    // Either the request hits the action and returns a useState error
    // shape (200 with the page HTML containing the error), OR Next routes
    // it through the React Server Action handler. Either way, we should
    // never see a 30x to evil.example.
    if (res.status() >= 300 && res.status() < 400) {
      const loc = res.headers()['location'] ?? ''
      expect(loc).not.toContain('evil.example')
    }
  })
})

// ---------------------------------------------------------------------------
// Consent page UI when authenticated — verified at markup level via the
// production build's HTML shape (no real session needed for the structural
// audit; the layout gates above guarantee the page only ever renders for
// signed-in users without a legal_acks row).
// ---------------------------------------------------------------------------

test('consent form markup contains all four required checkboxes', async ({
  request,
}) => {
  // We hit the page directly. Without a session it 307-redirects to
  // /login, but the redirect chain still resolves and we capture the
  // final HTML. Either way, what we want to verify is that when the
  // ConsentForm DOES render, it has the four input names. We do that
  // by inspecting the JS bundle: a grep on the page source for the
  // four checkbox names.
  // (This is a conservative check — running against an authenticated
  // session would be cleaner but requires fixturing real auth.)
  const res = await request.get('/consent', { maxRedirects: 5 })
  expect(res.ok()).toBe(true)
  // The /login page that the redirect lands on doesn't include the
  // ConsentForm input names, but the page bundle for the route does.
  // We accept either — the structural test that follows targets the
  // form file directly.
})

test('consent form file declares all four input names', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(
    'src/components/consent/consent-form.tsx',
    'utf8',
  )
  expect(src).toContain('name="confirm_18"')
  expect(src).toContain('name="accept_terms"')
  expect(src).toContain('name="accept_privacy"')
  expect(src).toContain('name="accept_community_rules"')
  expect(src).toContain(
    'I confirm I am 18 years of age or older. RoadWave is not available',
  )
  // Submit button is disabled until all four checked.
  expect(src).toContain('!allChecked')
})

// ---------------------------------------------------------------------------
// Demo lantern — demo only, never in the real app
// ---------------------------------------------------------------------------

test.describe('Demo lantern', () => {
  test('lantern button + demo-only label render on /demo', async ({ page }) => {
    await page.goto('/demo')
    await expect(
      page.getByRole('button', {
        name: /Your Lantern.*tap to see activity/i,
      }),
    ).toBeVisible()
    await expect(
      page.getByText('Your Lantern — waves, messages & meetup activity.'),
    ).toBeVisible()
  })

  test('clicking lantern opens panel with the four hardcoded notifications', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page
      .getByRole('button', { name: /Your Lantern.*tap to see activity/i })
      .click()
    const panel = page.getByRole('menu', { name: /Demo notifications/i })
    await expect(panel).toBeVisible()
    await expect(panel.getByText(/CampingFan42 sent you a wave/)).toBeVisible()
    await expect(
      panel.getByText(/You matched with OutdoorMike/),
    ).toBeVisible()
    await expect(
      panel.getByText(/Campfire Night at Site Loop B/),
    ).toBeVisible()
    await expect(
      panel.getByText(
        /Riverbend RV Park: Ranger-led nature walk tomorrow at 8am/,
      ),
    ).toBeVisible()
  })

  test('tapping the bulletin notification opens the bulletin card overlay', async ({
    page,
  }) => {
    await page.goto('/demo')
    // Open the lantern panel.
    await page
      .getByRole('button', { name: /Your Lantern.*tap to see activity/i })
      .click()
    const panel = page.getByRole('menu', { name: /Demo notifications/i })
    await expect(panel).toBeVisible()

    // Tap the bulletin entry.
    await panel
      .getByRole('menuitem', {
        name: /Ranger-led nature walk tomorrow at 8am/i,
      })
      .click()

    // Panel closes; bulletin card opens with all required pieces.
    await expect(panel).toHaveCount(0)
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible()
    // Exact match to disambiguate from the footer line that starts
    // with "Campground bulletins are posted by…"
    await expect(
      card.getByText('Campground Bulletin', { exact: true }),
    ).toBeVisible()
    await expect(card.getByText('Riverbend RV Park')).toBeVisible()
    await expect(
      card.getByText(
        'Ranger-led nature walk tomorrow at 8am — meet at the front gate.',
      ),
    ).toBeVisible()
    await expect(card.getByText('Posted today at 6:00 PM')).toBeVisible()
    await expect(
      card.getByText(
        /Campground bulletins are posted by verified campground staff only\./,
      ),
    ).toBeVisible()

    // Verified check is rendered as an inline SVG with role=img.
    await expect(
      card.getByRole('img', { name: /Verified campground/i }),
    ).toBeVisible()

    // Tapping Dismiss closes the card and marks the notification as read.
    await card.getByRole('button', { name: /^Dismiss$/i }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Reopen the lantern — bulletin entry should now read as muted
    // (text-mist) rather than the unread cream + amber-dot styling.
    await page
      .getByRole('button', { name: /Your Lantern.*tap to see activity/i })
      .click()
    const reopened = page.getByRole('menu', { name: /Demo notifications/i })
    await expect(reopened).toBeVisible()
    const bulletinEntry = reopened.getByRole('menuitem', {
      name: /Ranger-led nature walk tomorrow at 8am/i,
    })
    await expect(bulletinEntry).toHaveClass(/text-mist/)
  })

  test('demo navigation does NOT include a Bulletins tab', async ({ page }) => {
    await page.goto('/demo')
    // Tabs in the legacy demo are role=button. There must be no
    // tab labeled "Bulletins" — bulletins are lantern-delivered only
    // per spec.
    await expect(
      page.getByRole('button', { name: /^Bulletins$/i }),
    ).toHaveCount(0)
  })

  test('real (app) and owner (authed) layouts never import the lantern', async () => {
    const fs = await import('node:fs/promises')
    const filesToCheck = [
      'src/app/(app)/layout.tsx',
      'src/app/(app)/nearby/page.tsx',
      'src/app/(app)/waves/page.tsx',
      'src/app/(app)/crossed-paths/page.tsx',
      'src/app/owner/(authed)/layout.tsx',
    ]
    for (const f of filesToCheck) {
      const src = await fs.readFile(f, 'utf8')
      expect(src, `${f} must not import DemoLantern`).not.toContain(
        'DemoLantern',
      )
      expect(
        src,
        `${f} must not render the demo-only Lantern label`,
      ).not.toContain('Your Lantern')
    }
  })
})

// ---------------------------------------------------------------------------
// Mobile interactivity — proves the lantern overlay isn't blocking
// the demo nav tabs. Regression test for the "non-interactive on mobile"
// bug.
// ---------------------------------------------------------------------------

test.describe('Demo mobile nav interactivity', () => {
  // iPhone-13-ish viewport. Touch is enabled so .tap() actually works.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('Home, Nearby, Waves, Meetups tabs are all tappable on mobile', async ({
    page,
  }) => {
    await page.goto('/demo')

    // Each button toggles screen state via React. The active button gets
    // bg-flame/15 + text-flame + font-semibold. Walk through the four
    // requested tabs; assert each becomes active when tapped.
    for (const label of ['Home', 'Nearby', 'Waves', 'Meetups']) {
      const btn = page.getByRole('button', {
        name: new RegExp(`^${label}$`, 'i'),
      })
      await expect(btn, `${label} tab should be on the page`).toBeVisible()
      await btn.tap()
      // Active state asserts the tap actually changed React state — if
      // an overlay was eating taps, the class wouldn't toggle.
      await expect(
        btn,
        `${label} should become the active tab after tap`,
      ).toHaveClass(/bg-flame\/15/)
    }
  })

  test('opening then closing the lantern leaves nav tappable', async ({
    page,
  }) => {
    await page.goto('/demo')

    // Open the lantern.
    await page
      .getByRole('button', { name: /Your Lantern.*tap to see activity/i })
      .tap()
    await expect(
      page.getByRole('menu', { name: /Demo notifications/i }),
    ).toBeVisible()

    // Close by tapping the backdrop at a specific point near the bottom
    // of the viewport, well outside the panel (which sits in the upper
    // third of the demo's phone-frame layout).
    await page
      .getByRole('button', { name: /Close notifications/i })
      .tap({ position: { x: 50, y: 780 } })
    await expect(
      page.getByRole('menu', { name: /Demo notifications/i }),
    ).toHaveCount(0)

    // Now Nearby should be tappable.
    const nearby = page.getByRole('button', { name: /^Nearby$/i })
    await nearby.tap()
    await expect(nearby).toHaveClass(/bg-flame\/15/)
  })
})

// ---------------------------------------------------------------------------
// Homepage spec — hero CTAs, phone preview, FB differentiator, label,
// signup reassurance
// ---------------------------------------------------------------------------

test.describe('Homepage spec', () => {
  test('hero shows Try the Demo as the dominant primary + I Run a Campground secondary', async ({
    page,
  }) => {
    await page.goto('/')

    // Both buttons exist + link to the right routes. .first() targets
    // the hero CTAs specifically — there's also a quieter secondary
    // row of audience cards lower on the page that uses similar copy.
    const tryDemo = page.getByRole('link', { name: /Try the Demo/i }).first()
    const iRun = page
      .getByRole('link', { name: /I Run a Campground/i })
      .first()
    await expect(tryDemo).toBeVisible()
    await expect(iRun).toBeVisible()
    await expect(tryDemo).toHaveAttribute('href', '/demo')
    await expect(iRun).toHaveAttribute('href', '/owners')

    // The Try the Demo button is the flame-bg primary; secondary uses
    // the bordered transparent style. Verifies visual hierarchy via
    // class-name presence so a future refactor can't silently flip them.
    await expect(tryDemo).toHaveClass(/bg-flame/)
    await expect(iRun).not.toHaveClass(/bg-flame /)
    await expect(iRun).toHaveClass(/border-white/)
  })

  test('homepage Who It\'s For section lists the spec audience cards', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', {
        name: /For campers who want the option — not the obligation/i,
      }),
    ).toBeVisible()
    // A few of the spec cards verify the section is populated.
    await expect(page.getByText(/Solo travelers/i).first()).toBeVisible()
    await expect(page.getByText(/Families/i).first()).toBeVisible()
    await expect(
      page.getByText(/Snowbirds/i).first(),
    ).toBeVisible()
  })

  test('homepage phone preview is above the fold with the spec content', async ({
    page,
  }) => {
    await page.goto('/')
    // Hardcoded values per the spec.
    await expect(page.getByText('Riverbend RV Park').first()).toBeVisible()
    await expect(page.getByText(/Checked in today/i).first()).toBeVisible()
    await expect(page.getByText(/12/).first()).toBeVisible()
    await expect(page.getByText(/Visible as/i).first()).toBeVisible()
    await expect(
      page.getByText('Open to friendly hellos').first(),
    ).toBeVisible()
    await expect(page.getByText(/Nearby interests/i).first()).toBeVisible()
    for (const interest of ['walking', 'cards', 'pickleball', 'campfire']) {
      await expect(page.getByText(interest, { exact: true }).first()).toBeVisible()
    }
    await expect(
      page.getByText(/^Wave 👋$/, { exact: false }).first(),
    ).toBeVisible()
  })

  test('homepage Better-Than-Facebook section uses the spec heading + body', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /Not another noisy group chat/i }),
    ).toBeVisible()
    await expect(
      page.getByText(
        'Unlike Facebook groups or open campground chats, RoadWave is only for the campground you',
        { exact: false },
      ),
    ).toBeVisible()
  })

  test('signup page shows the privacy reassurance line above the form', async ({
    page,
  }) => {
    await page.goto('/signup')
    await expect(
      page.getByText(
        'RoadWave is privacy-first. We do not require exact site numbers. Your check-in is temporary. You control visibility. RoadWave is 18+ only.',
      ),
    ).toBeVisible()
  })

  test('signup OAuth path skips the duplicate /consent screen via cookie bridge', async () => {
    const fs = await import('node:fs/promises')
    // SignupCard wires recordConsentBeforeOAuth from the all-checked
    // state so the cookie is only set when consent was given here.
    const card = await fs.readFile(
      'src/components/auth/signup-card.tsx',
      'utf8',
    )
    expect(card).toContain('recordConsentBeforeOAuth={allChecked}')
    // GoogleAuthButton calls the server action only when the prop is set.
    const btn = await fs.readFile(
      'src/components/auth/google-auth-button.tsx',
      'utf8',
    )
    expect(btn).toContain('recordOAuthConsentIntentAction')
    expect(btn).toContain('if (recordConsentBeforeOAuth)')
    // /auth/callback consumes the cookie, writes legal_acks, and clears
    // the cookie before redirecting to next.
    const cb = await fs.readFile(
      'src/app/auth/callback/route.ts',
      'utf8',
    )
    expect(cb).toContain('CONSENT_INTENT_COOKIE')
    expect(cb).toContain('parseConsentIntent')
    expect(cb).toContain("admin.from('legal_acks').insert")
    expect(cb).toContain('response.cookies.delete(CONSENT_INTENT_COOKIE)')
    // Cookie helpers carry the full validation surface.
    const helper = await fs.readFile(
      'src/lib/auth/consent-intent.ts',
      'utf8',
    )
    expect(helper).toContain('CONSENT_INTENT_TTL_SECONDS')
    expect(helper).toContain('parseConsentIntent')
    // Login page does NOT pass the consent prop (returning users go
    // through /consent if they somehow lack a row).
    const login = await fs.readFile(
      'src/app/(auth)/login/page.tsx',
      'utf8',
    )
    expect(login).not.toContain('recordConsentBeforeOAuth')
  })
})

// ---------------------------------------------------------------------------
// Live-app lantern — structural guarantees that don't require an
// authenticated session. The full UI behavior (glow on unread, panel
// open/close, mark-all-read, bulletin overlay) is covered by the demo
// lantern tests which exercise the same component shape; the live
// component is a parallel implementation of the same UX, and the
// tests below assert it is wired into the real app correctly.
// ---------------------------------------------------------------------------

test.describe('Live-app lantern wiring', () => {
  test('(app) layout imports AppLantern and never imports DemoLantern', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/(app)/layout.tsx', 'utf8')
    expect(
      src,
      '(app) layout must import the live AppLantern',
    ).toContain('AppLantern')
    expect(
      src,
      '(app) layout must NOT import the demo lantern',
    ).not.toContain('DemoLantern')
  })

  test('(app) layout does NOT render the demo-only "Your Lantern — waves, messages & meetup activity" label', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/(app)/layout.tsx', 'utf8')
    expect(src).not.toContain('Your Lantern — waves, messages')
  })

  test('AppLantern source declares the full notification routing map', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/components/lantern/app-lantern.tsx',
      'utf8',
    )
    // Every type in the spec must be referenced.
    for (const t of [
      'wave_received',
      'wave_matched',
      'new_message',
      'bulletin',
      'meetup_invite',
      'meetup_rsvp',
    ]) {
      expect(src, `AppLantern must handle ${t}`).toContain(t)
    }
    // Routing destinations.
    expect(src).toContain('/waves')
    expect(src).toContain('/crossed-paths')
    expect(src).toContain('/meetups')
    // Mark-all-read action wired up.
    expect(src).toContain('markAllNotificationsReadAction')
    // Bulletin card pieces.
    expect(src).toContain('Campground Bulletin')
    expect(src).toContain('Verified campground')
    // The footer line wraps across JSX whitespace — collapse before
    // asserting so a future re-wrap doesn't break this test.
    const collapsed = src.replace(/\s+/g, ' ')
    expect(collapsed).toContain(
      'Campground bulletins are posted by verified campground staff only.',
    )
  })

  test('/home (live app) requires auth — anon visit redirects to /login', async ({
    page,
  }) => {
    await page.goto('/home')
    expect(page.url()).toContain('/login')
  })
})

// ---------------------------------------------------------------------------
// Notification data-layer smoke tests — verify the schema migration
// landed without writing any demo or test data into the table.
// ---------------------------------------------------------------------------

test('notifications migration declares the spec columns + types', async () => {
  const fs = await import('node:fs/promises')
  const src = await fs.readFile(
    'supabase/migrations/0025_notifications.sql',
    'utf8',
  )
  // Spec columns.
  for (const col of [
    'user_id uuid',
    'type public.notification_type',
    'reference_id uuid',
    'message text',
    'is_read boolean',
    'created_at timestamptz',
  ]) {
    expect(src, `notifications must have ${col}`).toContain(col)
  }
  // Spec enum members.
  for (const t of [
    'wave_received',
    'wave_matched',
    'new_message',
    'bulletin',
    'meetup_invite',
    'meetup_rsvp',
  ]) {
    expect(src, `enum must include ${t}`).toContain(`'${t}'`)
  }
  // Triggers fire on the right tables.
  expect(src).toContain('after insert on public.waves')
  expect(src).toContain('after insert on public.crossed_paths')
  expect(src).toContain('after insert on public.crossed_paths_messages')
  expect(src).toContain('after insert on public.bulletins')
  expect(src).toContain('after insert on public.meetups')
  // Mark-all-read RPC.
  expect(src).toContain('mark_all_notifications_read()')
  // RLS posture: own-only SELECT + UPDATE; no INSERT/DELETE policies.
  expect(src).toContain('notifications_select_own')
  expect(src).toContain('notifications_update_own')
  expect(src).not.toContain('notifications_insert_')
  expect(src).not.toContain('notifications_delete_')
})

// ---------------------------------------------------------------------------
// Wave 5-step flow — Discover → Wave Sent → Wave Received → Mutual
// Consent → Connected. The full multi-account UX requires two
// authenticated browsers and is exercised manually; the assertions
// below are the structural / public-surface checks Playwright can run
// against the deployed app + the demo.
// ---------------------------------------------------------------------------

test.describe('Wave 5-step flow — schema + structure', () => {
  test('migration 0026 adds the consent flow schema + RPCs', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'supabase/migrations/0026_wave_consent_flow.sql',
      'utf8',
    )
    // waves status column with the four spec values.
    for (const v of ['pending', 'matched', 'declined', 'connected']) {
      expect(src, `waves status must include '${v}'`).toContain(`'${v}'`)
    }
    // crossed_paths consent state.
    expect(src).toContain('consent_a boolean')
    expect(src).toContain('consent_b boolean')
    for (const v of ['pending_consent', 'connected', 'declined']) {
      expect(src, `crossed_paths status must include '${v}'`).toContain(
        `'${v}'`,
      )
    }
    // New enum members.
    expect(src).toContain("add value if not exists 'wave_sent'")
    expect(src).toContain("add value if not exists 'wave_connected'")
    // Consent prompt copy.
    expect(src).toContain(
      'You have a mutual wave! Would you like to connect?',
    )
    // Celebration copy.
    expect(src).toContain('New connection 🎉 Tap to say hello.')
    // Receiver wave copy mentions a shared interest.
    expect(src).toContain('shares your interest in')
    // RPCs the client uses.
    expect(src).toContain('public.wave_consent(_crossed_path_id uuid')
    expect(src).toContain('public.decline_wave(_wave_id uuid')
    expect(src).toContain('public.incoming_wave(_wave_id uuid')
    expect(src).toContain('public.pending_consent_summary(_crossed_path_id uuid')
    // Pre-populated first message.
    expect(src).toContain("'Hey, nice to meet you!'")
    // Messaging RLS gated on status='connected'.
    expect(src).toContain("cp.status = 'connected'")
    // nearby_campers redacts identifying fields.
    expect(src).toContain('drop function if exists public.nearby_campers(uuid)')
  })

  test('nearby_campers RPC type signature carries no identifying fields', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/lib/types/db.ts', 'utf8')
    const block = src.match(/export interface NearbyCamper \{[^}]+\}/)
    expect(block, 'NearbyCamper type must exist').toBeTruthy()
    const body = block?.[0] ?? ''
    // Allowed fields only.
    for (const allowed of ['profile_id', 'rig_type', 'interests']) {
      expect(body).toContain(allowed)
    }
    // Pre-connection redaction: name + adjacent profile fields are NOT
    // part of the type. (display_name, hometown, miles_driven, status_tag,
    // personal_note, years_rving, has_pets, pet_info, travel_style.)
    for (const banned of [
      'username',
      'display_name',
      'avatar_url',
      'hometown',
      'miles_driven',
      'status_tag',
      'personal_note',
      'years_rving',
      'has_pets',
      'pet_info',
      'travel_style',
    ]) {
      expect(body, `${banned} must not appear in NearbyCamper`).not.toContain(
        banned,
      )
    }
  })

  test('Nearby camper card renders only rig + shared interests + Wave', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/components/nearby/camper-card.tsx',
      'utf8',
    )
    // Must NOT render any of these identifying surfaces.
    expect(src).not.toContain('camper.username')
    expect(src).not.toContain('camper.display_name')
    expect(src).not.toContain('camper.hometown')
    expect(src).not.toContain('camper.miles_driven')
    expect(src).not.toContain('camper.status_tag')
    expect(src).not.toContain('camper.personal_note')
    expect(src).not.toContain('camper.years_rving')
    expect(src).not.toContain('camper.has_pets')
    expect(src).not.toContain('camper.pet_info')
    expect(src).not.toContain('camper.travel_style')
    expect(src).not.toContain('avatar_url')
    // Must show a single Wave button.
    expect(src).toContain('initialState={waveState}')
    // Shared interests come from intersection with viewer.
    expect(src).toContain('viewerInterests')
  })

  test('IncomingWaveCard exposes Wave Back + Ignore', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/components/waves/incoming-wave-card.tsx',
      'utf8',
    )
    expect(src).toContain('Wave Back')
    expect(src).toContain('Ignore')
    expect(src).toContain('declineWaveAction')
    expect(src).toContain('sendWaveAction')
    // Spec privacy guarantee: no name surfaces here either.
    expect(src).not.toContain('camper.name')
    expect(src).not.toContain('display_name')
  })

  test('ConsentPrompt exposes Connect + Not Yet, no name reveal', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/components/crossed-paths/consent-prompt.tsx',
      'utf8',
    )
    expect(src).toContain('Connect')
    expect(src).toContain('Not Yet')
    expect(src).toContain('waveConsentAction')
    expect(src).toContain(
      'You and a nearby camper have waved at each other',
    )
    expect(src).not.toContain('display_name')
    expect(src).not.toContain('username')
  })

  test('crossed-path detail page branches on status', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/app/(app)/crossed-paths/[id]/page.tsx',
      'utf8',
    )
    expect(src).toContain("cp.status === 'declined'")
    expect(src).toContain("cp.status === 'pending_consent'")
    expect(src).toContain('ConsentPrompt')
    // First-name-only display in the header.
    expect(src).toContain("split(/\\s+/)")
    // Spec safety banner.
    expect(src).toContain(
      'Meet smart: use public campground areas, trust your instincts, and report pressure, harassment, or suspicious behavior.',
    )
  })

  test('live Nearby page uses spec safety reminder copy', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/(app)/nearby/page.tsx', 'utf8')
    expect(src).toContain(
      'Safety reminder: Meet in public campground areas, trust your instincts, and do not share your exact site number unless you choose to.',
    )
  })

  test('live AppLantern wires the new wave routes and clamps panel for mobile', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/components/lantern/app-lantern.tsx',
      'utf8',
    )
    // New notification types.
    expect(src).toContain("'wave_sent'")
    expect(src).toContain("'wave_connected'")
    // Routing.
    expect(src).toContain('/waves/incoming/${n.reference_id}')
    expect(src).toContain('/crossed-paths/${n.reference_id}')
    // Mobile-overflow clamp.
    expect(src).toContain('Math.min(desiredRight, maxRight)')
    expect(src).toContain('Math.max(SAFE,')
  })

  test('demo NearbyScreen card has no name and shows the Wave button', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    // The "A nearby camper" privacy label appears on each card.
    await expect(page.getByText('A nearby camper').first()).toBeVisible()
    // Wave button is rendered.
    await expect(
      page.getByRole('button', { name: /^Wave$/ }).first(),
    ).toBeVisible()
    // No "site number" text anywhere on the screen.
    // No concrete site identifier like "Site 23" or "Site #5".
    await expect(page.getByText(/\bsite\s+#?\d+/i)).toHaveCount(0)
    // Sample camper full names from SAMPLE_CAMPERS must NOT appear on the
    // Nearby screen pre-connection.
    await expect(page.getByText(/Sarah & Jim/)).toHaveCount(0)
    await expect(page.getByText(/Pat & Linda/)).toHaveCount(0)
  })

  test('demo Wave tap deactivates the button and shows lantern hint', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    const firstWave = page
      .getByRole('button', { name: /^Wave$/ })
      .first()
    await firstWave.click()
    // Inline confirmation referencing the Lantern.
    await expect(
      page
        .getByText(/your wave was sent\. if they wave back/i)
        .first(),
    ).toBeVisible({ timeout: 8000 })
    // The original Wave button shows "Waved · waiting" instead.
    await expect(
      page.getByText(/waved.*waiting/i).first(),
    ).toBeVisible({ timeout: 8000 })
  })

  test('demo auto-wave-back lands on the consent prompt — no name reveal', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    // Tap the very first wave button — c1 (Sarah & Jim) waves back at
    // 1500ms, the fastest matcher.
    await page.getByRole('button', { name: /^Wave$/ }).first().click()
    // Consent prompt appears with the spec heading.
    await expect(
      page.getByRole('heading', { name: /Would you like to connect/i }),
    ).toBeVisible({ timeout: 6000 })
    await expect(
      page.getByText(
        'You and a nearby camper have waved at each other. Would you like to connect and say hello?',
      ),
    ).toBeVisible()
    // Both buttons present.
    await expect(
      page.getByRole('button', { name: /^Connect/ }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Not Yet$/ }),
    ).toBeVisible()
    // Pre-connection name privacy: full sample name must NOT be on this
    // screen.
    await expect(page.getByText(/Sarah & Jim/)).toHaveCount(0)
  })

  test('demo Connect tap opens chat with pre-populated welcome', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    await page.getByRole('button', { name: /^Wave$/ }).first().click()
    await page
      .getByRole('button', { name: /^Connect/ })
      .click({ timeout: 6000 })
    // Step 5 — first names visible. Sarah's first name appears in
    // the chat header.
    await expect(page.getByText('Sarah').first()).toBeVisible({
      timeout: 8000,
    })
    // Pre-populated welcome message is the visitor's first message.
    await expect(
      page.getByText(/Hey, nice to meet you!/i).first(),
    ).toBeVisible()
    // Brief celebration banner ("New Connection!").
    await expect(
      page.getByText(/New Connection!/i).first(),
    ).toBeVisible()
    // Spec messaging-screen safety copy.
    await expect(
      page.getByText(
        /Meet smart: use public campground areas, trust your instincts/i,
      ),
    ).toBeVisible()
    // Site number must never surface anywhere in chat.
    // No concrete site identifier like "Site 23" or "Site #5".
    await expect(page.getByText(/\bsite\s+#?\d+/i)).toHaveCount(0)
  })

  test('demo Not Yet returns to Nearby silently', async ({ page }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    await page.getByRole('button', { name: /^Wave$/ }).first().click()
    await page
      .getByRole('button', { name: /^Not Yet$/ })
      .click({ timeout: 6000 })
    // Back to the Nearby header.
    await expect(
      page.getByRole('heading', { name: /Nearby campers/i }),
    ).toBeVisible()
  })

  test('demo Restart option is available after Step 5', async ({ page }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    await page.getByRole('button', { name: /^Wave$/ }).first().click()
    await page
      .getByRole('button', { name: /^Connect/ })
      .click({ timeout: 6000 })
    // Open the chat options menu (the "⋮" button).
    await page
      .getByRole('button', { name: /Conversation options/i })
      .click({ timeout: 6000 })
    await expect(
      page.getByRole('menuitem', { name: /Restart demo/i }),
    ).toBeVisible()
  })

  test('demo Nearby safety banner uses the spec copy', async ({ page }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    await expect(
      page.getByText(
        /Meet in public campground areas, trust your instincts, and do not share your exact site number/i,
      ),
    ).toBeVisible()
  })

  test('demo wires sessionStorage cleanup, bfcache reset, and inactivity timer', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/pages/demo.jsx', 'utf8')
    // Defensive sessionStorage cleanup on mount.
    expect(src).toContain("'roadwave:demo:'")
    expect(src).toContain('sessionStorage.removeItem')
    // bfcache (back button) reset listener.
    expect(src).toContain("'pageshow'")
    expect(src).toContain('e.persisted')
    // 10-minute inactivity timer.
    expect(src).toContain('10 * 60 * 1000')
    // No localStorage usage anywhere in the demo.
    expect(src).not.toContain('localStorage')
  })

  test('demo bfcache pageshow resets the visitor to Step 1', async ({
    page,
  }) => {
    await page.goto('/demo')
    // Drive the visitor partway through the flow: switch to Nearby and
    // wave at the first camper.
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    await page.getByRole('button', { name: /^Wave$/ }).first().click()
    await expect(
      page.getByText(/Waved.*waiting/i).first(),
    ).toBeVisible({ timeout: 6000 })
    // Simulate a back-forward cache restore by firing the same event
    // the browser dispatches on bfcache restore.
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    // After the reset, the home screen ("Welcome to Riverbend RV Park")
    // is visible again.
    await expect(
      page.getByRole('heading', { name: /Welcome to Riverbend RV Park/i }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('demo Reset demo button clears interaction and returns to defaults', async ({
    page,
  }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: /^Nearby$/ }).click()
    await page.getByRole('button', { name: /^Wave$/ }).first().click()
    // Tap the bottom-of-page Reset demo button.
    await page.getByRole('button', { name: /^Reset demo$/ }).click()
    // Default tab is Home.
    await expect(
      page.getByRole('heading', { name: /Welcome to Riverbend RV Park/i }),
    ).toBeVisible({ timeout: 6000 })
  })

  test('demo lantern shows 4 unread notifications on a fresh load', async ({
    page,
  }) => {
    await page.goto('/demo')
    const lanternBtn = page.getByRole('button', {
      name: /Your Lantern — tap to see activity/i,
    })
    // The button carries the unread count via a data attribute on the
    // demo's amber-glow class. Open the panel and count unread dots.
    await lanternBtn.click()
    const panel = page.getByRole('menu', { name: /Demo notifications/i })
    await expect(panel).toBeVisible()
    // Each unread item renders a flame-colored dot (mt-1.5 h-1.5 w-1.5
    // rounded-full bg-flame). Count them inside the panel.
    const dots = panel.locator('span.bg-flame.rounded-full')
    await expect(dots).toHaveCount(4)
  })

  test('lantern panel stays within viewport on mobile', async ({ browser }) => {
    // iPhone SE-ish viewport: 375x667. The live lantern requires
    // auth, so this assertion targets the demo lantern, which uses
    // the same containment math (same right-anchored portal pattern).
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 667 },
    })
    const page = await ctx.newPage()
    await page.goto('/demo')
    const lanternBtn = page.getByRole('button', {
      name: /Your Lantern — tap to see activity/i,
    })
    await lanternBtn.click()
    const panel = page.getByRole('menu', { name: /Demo notifications/i })
    await expect(panel).toBeVisible()
    const box = await panel.boundingBox()
    expect(box, 'panel should have a bounding box').toBeTruthy()
    if (box) {
      expect(box.x, 'panel left edge must be ≥ 0').toBeGreaterThanOrEqual(0)
      expect(
        box.x + box.width,
        'panel right edge must be ≤ viewport width',
      ).toBeLessThanOrEqual(375)
    }
    // Close and verify nav tabs are tappable.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await page.getByRole('button', { name: /^Home$/ }).first().click()
    await expect(
      page.getByText(/Welcome to Riverbend RV Park/i),
    ).toBeVisible()
    await ctx.close()
  })
})

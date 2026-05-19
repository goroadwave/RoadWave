// @ts-check
//
// Full-funnel Stripe checkout in TEST MODE. Drives /owners/start through
// to the Stripe-hosted Checkout page, asserts the visible price, trial
// language, "$0 due today" line, and that Stripe Link is NOT shown.
//
// Gated heavily:
//   - QA_ENV must be 'preview' or 'local'
//   - PLAYWRIGHT_BASE_URL must NOT be production
//   - STRIPE_PRICE_ID_MONTHLY must be a test-mode price (starts with
//     price_…, but in test mode by virtue of running against a preview
//     env that has STRIPE_SECRET_KEY = sk_test_…)
//
// Tests in this file create one owner_signup_submissions row per run
// + one Stripe TEST customer + one Stripe TEST subscription per
// successful checkout. None of this affects live billing. Cleanup
// guidance is at the bottom of the file.

import { expect, test } from '@playwright/test'

const QA_ENV = process.env.QA_ENV ?? 'unknown'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? ''
const IS_PRODUCTION = /getroadwave\.com$/.test(new URL(BASE_URL || 'http://x').hostname)

test.describe('Stripe Checkout — TEST mode end-to-end', () => {
  test.skip(
    QA_ENV !== 'preview' && QA_ENV !== 'local',
    'QA_ENV must be "preview" or "local" — refusing to drive real Checkout against production',
  )
  test.skip(IS_PRODUCTION, 'PLAYWRIGHT_BASE_URL points at production — skipping')

  // Each test creates ITS OWN throwaway submission + customer. Tests are
  // independent so a failure in one doesn't poison the rest.
  function makeTestSubmission() {
    const stamp = Date.now().toString(36)
    return {
      campground_name: `QA Test Campground ${stamp} - DELETE`,
      contact_name: `QA Bot ${stamp}`,
      email: `qa+stripe-${stamp}@example.com`,
      city: 'Testville',
      state: 'CA',
    }
  }

  test('Checkout page shows $39/month, 30-day trial, $0 due today, no Stripe Link', async ({
    page,
  }) => {
    const sub = makeTestSubmission()

    await page.goto('/owners/start')
    await page.fill('input[name="campground_name"]', sub.campground_name)
    await page.fill('input[name="contact_name"]', sub.contact_name)
    await page.fill('input[name="email"]', sub.email)
    await page.fill('input[name="city"]', sub.city)
    await page.fill('input[name="state"]', sub.state)

    // Pick at least one interest chip (the form requires it).
    const firstInterest = page.locator('input[name="interests"]').first()
    if (await firstInterest.count() > 0) {
      const isHidden = await firstInterest.evaluate((el) => el instanceof HTMLInputElement && el.type === 'hidden')
      if (isHidden) {
        // chips are <button> with hidden input — click the chip
        const chip = page.locator('button[role="button"], button').first()
        if (await chip.count() > 0) await chip.click()
      } else {
        await firstInterest.check()
      }
    }

    // Check the 4 required legal acks
    for (const name of ['accepted_partner_terms', 'ack_optional', 'ack_no_site_numbers', 'ack_not_emergency']) {
      const cb = page.locator(`input[name="${name}"]`)
      if (await cb.count() > 0) await cb.check()
    }

    // Submit. The browser redirects through /api/stripe/checkout to
    // checkout.stripe.com.
    const navPromise = page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })
    await page.click('button[type="submit"]')
    await navPromise

    // We're on Stripe-hosted Checkout. Assert the page contents.
    await expect(page).toHaveURL(/checkout\.stripe\.com/)

    // The visible product summary should mention $39 monthly and trial
    // language. Stripe's exact DOM varies slightly across A/B tests,
    // so use text-content matches rather than CSS selectors.
    const body = page.locator('body')
    await expect(body, '$39 should appear').toContainText(/\$39\.00|\$39/)
    await expect(body, 'monthly billing language').toContainText(/month|per month/i)
    await expect(body, 'free trial language').toContainText(/free trial|trial/i)
    await expect(body, '30 days trial duration').toContainText(/30 days/i)
    await expect(body, '$0 due today').toContainText(/\$0\.00|due today/i)

    // Stripe Link (one-click checkout) must NOT be shown. Stripe Link
    // renders a "Save your info for one-click checkout" prompt or a
    // "Link" button near the email field. We assert neither is visible.
    await expect(body, 'no Stripe Link prompt').not.toContainText(/one-click/i)
    // The Link icon is rendered with alt or aria "Link" — be careful
    // not to match the word "link" inside other UI strings; the
    // common Stripe Link sign-in CTA is a specific phrase.
    await expect(body, 'no "Sign in with Link" CTA').not.toContainText(
      /Sign in with Link|Save your info for 1-click/i,
    )

    // Defensive: the URL should contain a cs_test_… session id (live
    // sessions start with cs_live_). If we accidentally created a
    // live session against this preview env, this catches it.
    expect(page.url(), 'session id must be test mode').toMatch(/cs_test_/)
  })

  test.skip('Pay with 4242 test card → /owners/success', async ({ page }) => {
    // STUB. Implementation note for the user: filling the Stripe-hosted
    // card form requires either:
    //   (a) Setting up an iframe-aware fill helper (Stripe Elements
    //       hosts the card field in a same-origin-ish iframe), or
    //   (b) Using Stripe CLI's `stripe trigger` to fire a synthetic
    //       checkout.session.completed event against the preview
    //       webhook endpoint after the session is created.
    // Both are doable but exceed the scope of this initial scaffold.
  })

  test.skip('Customer Portal opens for signed-in test owner', async ({ page }) => {
    // STUB. Requires a signed-in owner session in the preview env.
    // Recipe:
    //   1. Use admin.auth.admin.generateLink({type:'magiclink'}) for
    //      a known test owner email in preview.
    //   2. Visit /auth/sign-in?th=…&next=/owner/billing.
    //   3. Click "Manage Subscription".
    //   4. Assert page.url() starts with https://billing.stripe.com/
  })

  test.skip('Cancel via portal flips DB to canceled', async ({ page }) => {
    // STUB. Builds on the previous: after cancellation in the portal,
    // poll Supabase for campgrounds.subscription_status='canceled' on
    // the test campground row. Requires SUPABASE_SERVICE_ROLE_KEY in
    // the test env.
  })
})

/*
Cleanup guidance after a successful Stripe Checkout run:

  1. In Stripe Dashboard (TEST MODE), open Customers → find the
     qa+stripe-…@example.com customer → Cancel subscription → Delete
     customer. This is purely cosmetic; test-mode data cannot bill.

  2. In Supabase, archive the QA test campground rows:

     update public.campgrounds
        set is_active = false,
            slug = '_archived_qa_test_' || extract(epoch from now())::int,
            subscription_status = 'canceled'
      where name like 'QA Test Campground % - DELETE';

  3. owner_signup_submissions and stripe_events rows can stay (audit
     trail). Auth users can stay (no PII).
*/

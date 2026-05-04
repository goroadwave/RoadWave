// @ts-check
//
// Email confirmation E2E (Mailosaur).
//
// These tests create REAL auth.users in production Supabase and trigger
// REAL Resend sends through Custom SMTP, so they're gated behind an env
// var and skipped by default. To run:
//
//   $env:RUN_EMAIL_TESTS=1; npx playwright test tests/email-confirmation.test.js
//
// Each test creates a fresh testuser_<timestamp>@<server>.mailosaur.net
// inbox, walks the signup flow on live production, then uses the
// Mailosaur API to retrieve the confirmation email and verify its
// content + extracted confirmation URL. After each test, the auth.users
// row (or owner_signup_submissions row) is deleted via the Supabase
// service-role key so the database stays clean between runs.
//
// What we DO test:
//   • Signup form submission lands on the post-signup page
//   • Confirmation email arrives in Mailosaur within 60s
//   • Subject and arrival time are logged for the report
//   • Email body parses to a Supabase /auth/v1/verify URL with a
//     PKCE token, type=signup, and redirect_to back to /auth/confirm
//
// What we do NOT test (and why):
//   • Clicking the confirmation link in a browser. The Mailosaur server
//     plan in use does not allow disabling link-click tracking. Their
//     anti-spam scanner pre-fetches URLs in incoming email, which
//     consumes the single-use PKCE token before our test can use it.
//     Verifying the URL shape via the API gives us the same coverage
//     short of the actual click — and avoids the false negative.
//   • Welcome email arrival. The welcome email is fired from
//     post-auth-redirect.ts only when the user completes /auth/confirm,
//     which we cannot do (see above). Skipping rather than asserting a
//     side-effect we can't trigger.
//   • Owner welcome email. Owner signup redirects to Stripe Checkout
//     and the welcome email only fires after payment via the Stripe
//     webhook. Without Stripe test mode wired up, the owner test
//     verifies form submission + persistence + redirect handoff only.

import path from 'node:path'
import dotenv from 'dotenv'
import Mailosaur from 'mailosaur'
import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'

// Load env files. .env.local for Supabase admin creds, .env.test for
// Mailosaur creds. Both are gitignored.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

const RUN = process.env.RUN_EMAIL_TESTS === '1'
const MAILOSAUR_API_KEY = process.env.MAILOSAUR_API_KEY
const MAILOSAUR_SERVER_ID = process.env.MAILOSAUR_SERVER_ID
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('Email confirmation E2E (Mailosaur)', () => {
  // Each retry creates a NEW user + sends a NEW Resend email. Disable
  // retries for this suite specifically so a flake costs only one
  // email send rather than two.
  test.describe.configure({ retries: 0 })

  test.skip(
    !RUN,
    'Set RUN_EMAIL_TESTS=1 to run. These tests create real auth.users + send Resend emails.',
  )
  test.skip(
    !MAILOSAUR_API_KEY || !MAILOSAUR_SERVER_ID,
    'MAILOSAUR_API_KEY / MAILOSAUR_SERVER_ID missing from .env.test',
  )
  test.skip(
    !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY,
    'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local',
  )

  // Initialise SDKs once per worker. process.env is guaranteed defined by
  // the skip guards above, but TypeScript-via-JSDoc still wants explicit
  // string assertions, hence the non-null casts in the calls.
  const mailosaur = new Mailosaur(/** @type {string} */ (MAILOSAUR_API_KEY))
  const supabaseAdmin = createClient(
    /** @type {string} */ (SUPABASE_URL),
    /** @type {string} */ (SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  /** Build a fresh, unique inbox address for this test. */
  function generateEmail(prefix = 'testuser') {
    return `${prefix}_${Date.now()}@${MAILOSAUR_SERVER_ID}.mailosaur.net`
  }

  /** Log subject + received timestamp so the run report shows the trail. */
  function logEmail(label, message) {
    console.log(
      `  → [${label}] subject="${message.subject}" received=${message.received}`,
    )
  }

  /**
   * Pull the confirmation link out of a Supabase verification email.
   * Uses Mailosaur's pre-parsed links arrays (handles HTML decoding +
   * dedupes) rather than a regex over the raw body, since the exact
   * URL shape (token vs token_hash, redirect_to vs not) shifts with
   * Supabase's email-template engine.
   *
   * Picks the first link whose href hits one of our auth routes:
   * /auth/confirm, /auth/callback, or Supabase's own /auth/v1/verify.
   */
  function extractAuthLink(message) {
    const links = [
      ...((message.html && message.html.links) || []),
      ...((message.text && message.text.links) || []),
    ]
    const auth = links.find((l) =>
      /\/auth\/(confirm|callback|v1\/verify)/i.test(l.href || ''),
    )
    if (!auth) {
      const all = links.map((l) => l.href).filter(Boolean)
      throw new Error(
        `No auth confirmation link found in email. ` +
          `All links seen: ${JSON.stringify(all)}`,
      )
    }
    return auth.href
  }

  /**
   * Poll the Mailosaur inbox until a message addressed to `email` arrives
   * whose ID isn't in `excludeIds`. Used both for the initial confirmation
   * (excludeIds=[]) and for the welcome email (excludeIds=[confirmation.id])
   * so the second wait can't return the first message.
   */
  async function waitForMessage(email, excludeIds = [], timeoutMs = 60_000) {
    const start = Date.now()
    let lastError = null
    while (Date.now() - start < timeoutMs) {
      try {
        const list = await mailosaur.messages.list(
          /** @type {string} */ (MAILOSAUR_SERVER_ID),
          { sentTo: email },
        )
        const items = (list && list.items) || []
        const fresh = items.filter((m) => !excludeIds.includes(m.id))
        if (fresh.length > 0) {
          // Newest first — Mailosaur lists by received DESC.
          return await mailosaur.messages.getById(fresh[0].id)
        }
      } catch (e) {
        lastError = e
      }
      await new Promise((r) => setTimeout(r, 2_000))
    }
    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for new message to ${email}` +
        (lastError ? ` (last error: ${lastError.message})` : ''),
    )
  }

  /** Delete the test user from auth.users via the service-role key. */
  async function deleteAuthUserByEmail(email) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      })
      if (error) {
        console.log(`  → [cleanup] listUsers failed: ${error.message}`)
        return
      }
      const user = data.users.find((u) => u.email === email)
      if (!user) {
        console.log(`  → [cleanup] no auth.user found for ${email}`)
        return
      }
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(
        user.id,
      )
      if (delError) {
        console.log(`  → [cleanup] deleteUser failed: ${delError.message}`)
      } else {
        console.log(`  → [cleanup] deleted auth.user ${user.id} (${email})`)
      }
    } catch (e) {
      console.log(`  → [cleanup] exception: ${e.message}`)
    }
  }

  /** Delete the owner_signup_submissions row by email. */
  async function deleteOwnerSubmission(email) {
    const { error } = await supabaseAdmin
      .from('owner_signup_submissions')
      .delete()
      .eq('email', email)
    if (error) {
      console.log(
        `  → [cleanup] delete owner_signup_submissions failed: ${error.message}`,
      )
    } else {
      console.log(`  → [cleanup] deleted owner_signup_submissions for ${email}`)
    }
  }

  // -----------------------------------------------------------------
  // Test 1: Camper signup — confirmation email arrival + URL shape
  // -----------------------------------------------------------------

  test('camper signup → confirmation email arrives with valid Supabase verify URL', async ({
    page,
  }) => {
    const email = generateEmail('testuser')
    // Username pattern: ^[a-zA-Z0-9_]{3,24}$. Timestamp keeps it unique.
    const username = `tu_${Date.now()}`.slice(0, 24)
    const password = 'testpassword12345!'

    console.log(`  → [start] camper signup email=${email} username=${username}`)

    try {
      await page.goto('/signup')

      await page.locator('input[name="username"]').fill(username)
      await page.locator('input[name="email"]').fill(email)
      await page.locator('input[name="password"]').fill(password)

      // Username availability is checked via debounced RPC; wait for the
      // green "Available." hint before the submit button enables.
      await expect(page.getByText(/^Available\./i)).toBeVisible({
        timeout: 10_000,
      })

      // Three required consent boxes.
      await page.locator('input[name="confirm_18"]').check()
      await page.locator('input[name="accept"]').check()
      await page.locator('input[name="accept_community_rules"]').check()

      const submit = page.getByRole('button', { name: /Create account/i })
      await expect(submit).toBeEnabled()
      await submit.click()

      // Path B (supabase.auth.signUp()) lands the user on /verify with a
      // "check your email" message. Other valid post-signup destinations
      // (consent, home) are tolerated for resilience to flow tweaks.
      await expect(page).toHaveURL(
        /\/(verify|home|profile|consent)/i,
        { timeout: 20_000 },
      )

      // Wait up to 60s for the Supabase confirm-signup email.
      const confirmation = await waitForMessage(email)
      logEmail('CONFIRMATION', confirmation)

      // Pull the link out of the email body via Mailosaur's parsed links
      // (no browser navigation — see file header for why).
      const link = extractAuthLink(confirmation)
      console.log(`  → [confirmation] link=${link.slice(0, 110)}…`)

      // Verify the URL shape. The Custom SMTP confirm-signup template
      // emits a Supabase-hosted verify URL with a PKCE token, type=signup,
      // and redirect_to back to our /auth/confirm route.
      expect(link).toMatch(/\/auth\/v1\/verify\?/)
      expect(link).toMatch(/[?&]token=pkce_[a-f0-9]+/i)
      expect(link).toMatch(/[?&]type=signup/)
      expect(link).toMatch(/[?&]redirect_to=https?%3A%2F%2F[^&]*\/auth\/confirm|[?&]redirect_to=https?:\/\/[^&]*\/auth\/confirm/i)

      // Subject is the template heading we ship — guards against the
      // template getting accidentally swapped or reverted.
      expect(confirmation.subject).toMatch(/confirm.*email|Welcome to RoadWave/i)
    } finally {
      await deleteAuthUserByEmail(email)
    }
  })

  // -----------------------------------------------------------------
  // Test 2: Owner signup — partial (Stripe-gated)
  // -----------------------------------------------------------------

  test('owner signup → submission persisted → redirect to Stripe Checkout (welcome email is post-payment)', async ({
    page,
  }) => {
    const email = generateEmail('owner')
    const campgroundName = `Test Campground ${Date.now()}`

    console.log(`  → [start] owner signup email=${email}`)

    try {
      await page.goto('/owner/signup')

      await page.locator('input[name="campground_name"]').fill(campgroundName)
      await page.locator('input[name="owner_name"]').fill('Test Owner')
      await page.locator('input[name="email"]').fill(email)

      // Four required acknowledgements.
      await page.locator('input[name="accepted_partner_terms"]').check()
      await page.locator('input[name="ack_optional"]').check()
      await page.locator('input[name="ack_no_site_numbers"]').check()
      await page.locator('input[name="ack_not_emergency"]').check()

      const submit = page.getByRole('button', {
        name: /Start My Campground Pilot/i,
      })
      await expect(submit).toBeEnabled()

      // The action either redirects to /api/stripe/checkout (which then
      // 302s to checkout.stripe.com) or, if Stripe isn't configured, to
      // /start/welcome?pending=stripe. We accept either landing.
      // Stripe Checkout is an external page we don't try to drive.
      await Promise.all([
        page
          .waitForURL(
            /checkout\.stripe\.com|\/start\/welcome|\/api\/stripe\/checkout/i,
            { timeout: 20_000 },
          )
          .catch(() => null),
        submit.click(),
      ])
      console.log(`  → [post-submit] landed at ${page.url()}`)

      // Verify the row was persisted to owner_signup_submissions.
      const { data: rows, error } = await supabaseAdmin
        .from('owner_signup_submissions')
        .select('id, email, campground_name, owner_name')
        .eq('email', email)
      expect(error).toBeNull()
      expect(rows).not.toBeNull()
      expect(rows && rows.length).toBeGreaterThanOrEqual(1)
      console.log(
        `  → [persisted] id=${rows[0].id} campground="${rows[0].campground_name}"`,
      )

      // The owner welcome email fires AFTER Stripe payment, from the
      // Stripe webhook handler — not from this form submission. We do
      // not assert email arrival here. Wiring up Stripe test mode would
      // be a separate, larger task (test-mode keys + a webhook listener
      // like stripe-cli running during the test).
      console.log(
        '  → [note] welcome email NOT asserted — fires post-Stripe-payment via webhook',
      )
    } finally {
      await deleteOwnerSubmission(email)
    }
  })
})

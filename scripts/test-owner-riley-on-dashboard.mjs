#!/usr/bin/env node
//
// E2E test: tapping Owner Riley on /owner/dashboard surfaces two
// bubbles (🗺️ Take a Tour, 💬 Chat with Riley), each of which opens
// its own owner-flavoured surface (owner tour overlay / owner chat
// panel). Mirror of test-riley-popup-on-home.mjs for the owner side.
//
// Approach:
//   1. Admin-create a throwaway user with email_confirm=true and
//      promote their profile to role='owner'.
//   2. Seed legal_acks so the (authed) owner layout's consent gate passes.
//      Seed a campground_admins row so the (authed) layout doesn't
//      bounce to /owner/setup.
//   3. Drive Playwright through /owner/login with that user's password.
//   4. Land on /owner/dashboard and walk Owner Riley's UX:
//        - Owner Riley mascot is present in bottom-right
//          (aria-label="Open Owner Riley menu")
//        - Tap → "Take a Tour" + "Chat with Riley" bubbles
//        - "Chat with Riley" → chat panel opens (aria "Chat with Riley 👋")
//        - Riley hidden while chat is open, reappears on close
//        - "Take a Tour" → owner tour overlay (5 steps: Profile, QR,
//          Marketing, Bulletin, Stats); Next/Back/Done all work.
//   5. Tear everything down in finally{}.
//
// Run: node scripts/test-owner-riley-on-dashboard.mjs
//
// Note: when run in CI (preview deploys gated by Vercel Deployment
// Protection), VERCEL_AUTOMATION_BYPASS_SECRET must be set so requests
// reach the app instead of Vercel's SSO page. The header is a no-op
// against production.

import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SITE = process.env.SMOKE_SITE_URL ?? 'https://www.getroadwave.com'

// RoadWave HQ campground — same one the camper smoke test uses for
// the active-check-in seed. campground_admins is many-to-many on the
// (campground_id, user_id) pair, so this is fine to share.
const CAMPGROUND_ID = '199f8d72-f761-493b-9fac-8b38d5380a59'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase admin creds in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let pass = true
function check(label, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? '  — ' + detail : ''}`)
  if (!ok) pass = false
}

const stamp = Date.now()
const email = `ownertest_${stamp}@f8yonvvh.mailosaur.net`
const password = `Roadwave-Test-${crypto.randomBytes(6).toString('hex')}!`

let userId = null
let createdAdminLink = false

try {
  // ---- 1. Create + email-confirm the test user ----
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
  if (createError || !createData?.user) {
    throw new Error(`createUser failed: ${createError?.message}`)
  }
  userId = createData.user.id
  console.log(`✓ created auth.users ${userId} (${email})`)

  // The handle_new_user trigger seeds profiles with role='guest'.
  // Promote to 'owner' so the (authed) owner layout's role gate passes.
  const { error: roleError } = await admin
    .from('profiles')
    .update({ role: 'owner' })
    .eq('id', userId)
  if (roleError) throw new Error(`profile role update failed: ${roleError.message}`)
  console.log(`✓ promoted profiles.role → 'owner'`)

  // ---- 2. Seed legal_acks ----
  const { error: ackError } = await admin.from('legal_acks').insert({
    user_id: userId,
    age_confirmed: true,
    accepted_terms: true,
    accepted_rules: true,
    terms_version: '2026-04',
    privacy_version: '2026-04',
    community_rules_version: '2026-04',
    confirmed_18_at: new Date().toISOString(),
    accepted_terms_at: new Date().toISOString(),
    accepted_privacy_at: new Date().toISOString(),
    accepted_community_rules_at: new Date().toISOString(),
  })
  if (ackError) throw new Error(`legal_acks insert failed: ${ackError.message}`)
  console.log(`✓ seeded legal_acks`)

  // ---- 3. Link to a campground so the layout doesn't bounce to setup ----
  const { error: adminLinkError } = await admin
    .from('campground_admins')
    .insert({ user_id: userId, campground_id: CAMPGROUND_ID })
  if (adminLinkError) {
    throw new Error(`campground_admins insert failed: ${adminLinkError.message}`)
  }
  createdAdminLink = true
  console.log(`✓ seeded campground_admins → RoadWave HQ`)

  // ---- 4. Drive Playwright through /owner/login ----
  const browser = await chromium.launch()
  const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? {
        'x-vercel-protection-bypass':
          process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        'x-vercel-set-bypass-cookie': 'true',
      }
    : undefined
  const ctx = await browser.newContext({ extraHTTPHeaders })
  const page = await ctx.newPage()

  await page.goto(`${SITE}/owner/login`, { waitUntil: 'networkidle' })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  // Wait for the URL to navigate AWAY from /owner/login. Server
  // action redirects to /owner (or /owner/dashboard directly) on
  // success; a failure surfaces an error string in the form.
  await Promise.all([
    page
      .waitForURL((url) => !url.toString().includes('/owner/login'), {
        timeout: 20_000,
      })
      .catch(() => {}),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ])
  console.log(`landed at ${page.url()}`)

  // If we never left /owner/login, screenshot the form so we can see
  // any error message before the rest of the test cascades into
  // confusing failures.
  if (page.url().includes('/owner/login')) {
    mkdirSync('test-results', { recursive: true })
    await page.screenshot({
      path: 'test-results/owner-login-failed.png',
      fullPage: true,
    })
    const errText = await page
      .locator('form p.text-red-300, [role="alert"]')
      .first()
      .innerText()
      .catch(() => '(no visible error)')
    throw new Error(`owner login did not redirect: ${errText}`)
  }

  // /owner is a server redirect to /owner/dashboard. Navigate
  // explicitly to be sure.
  if (!page.url().includes('/owner/dashboard')) {
    await page.goto(`${SITE}/owner/dashboard`, { waitUntil: 'networkidle' })
  }
  check(
    'authed /owner/dashboard (not /owner/login or /owner/setup)',
    !page.url().includes('/owner/login') &&
      !page.url().includes('/owner/setup'),
    page.url(),
  )

  mkdirSync('test-results', { recursive: true })

  // ---- 5. Owner Riley mascot present ----
  const rileyBtn = page.locator('button[aria-label="Open Owner Riley menu"]')
  check(
    'Owner Riley mascot present in bottom-right',
    (await rileyBtn.count()) === 1,
    `(found ${await rileyBtn.count()})`,
  )

  // ---- 6. Tap Riley → two-bubble popup ----
  await rileyBtn.click()
  const popup = page.locator('[role="dialog"][aria-label="Owner Riley menu"]')
  let popupOpened = false
  try {
    await popup.waitFor({ state: 'visible', timeout: 4000 })
    popupOpened = true
  } catch {
    await page.screenshot({
      path: 'test-results/owner-riley-popup-failed.png',
      fullPage: false,
    })
  }
  check('Owner Riley popup opens', popupOpened)

  const takeTourBtn = popup.getByRole('button', { name: /Take a Tour/ })
  const chatBtn = popup.getByRole('button', { name: /Chat with Riley/ })
  check('Take a Tour bubble present', (await takeTourBtn.count()) === 1)
  check('Chat with Riley bubble present', (await chatBtn.count()) === 1)

  await page.screenshot({
    path: 'test-results/owner-riley-popup-bubbles.png',
    fullPage: false,
  })

  // ---- 7. "Chat with Riley" opens the owner chat panel ----
  await chatBtn.click({ force: true })
  const chatPanel = page.locator(
    '[role="dialog"][aria-label="Chat with Riley 👋"]',
  )
  let chatOpened = false
  try {
    await chatPanel.waitFor({ state: 'visible', timeout: 4000 })
    chatOpened = true
  } catch {
    await page.screenshot({
      path: 'test-results/owner-riley-chat-open-failed.png',
      fullPage: false,
    })
  }
  check('Chat with Riley opens the owner chat panel', chatOpened)

  // While chat is open, Owner Riley button hides.
  const rileyHiddenWhileChatOpen =
    (await page
      .locator('button[aria-label="Open Owner Riley menu"]')
      .count()) === 0 &&
    (await page
      .locator('button[aria-label="Close Owner Riley menu"]')
      .count()) === 0
  check(
    'Owner Riley mascot is hidden while chat panel is open',
    rileyHiddenWhileChatOpen,
  )
  await page.screenshot({
    path: 'test-results/owner-riley-chat-open.png',
    fullPage: false,
  })

  // Close chat.
  await chatPanel.getByRole('button', { name: 'Close' }).click({ force: true })
  await chatPanel.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {})
  check(
    'Owner chat panel dismisses on Close',
    (await chatPanel.count()) === 0 || !(await chatPanel.isVisible()),
  )

  // Riley reappears.
  await page
    .locator('button[aria-label="Open Owner Riley menu"]')
    .waitFor({ state: 'visible', timeout: 4000 })
    .catch(() => {})
  check(
    'Owner Riley mascot reappears after chat closes',
    (await page
      .locator('button[aria-label="Open Owner Riley menu"]')
      .count()) === 1,
  )

  // ---- 8. "Take a Tour" opens the owner tour overlay ----
  await page.locator('button[aria-label="Open Owner Riley menu"]').click()
  await popup.waitFor({ state: 'visible', timeout: 4000 })
  await popup
    .getByRole('button', { name: /Take a Tour/ })
    .click({ force: true })

  const step1 = page.locator(
    '[role="dialog"][aria-label*="Owner tour step 1 of 5"]',
  )
  await step1.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Owner tour overlay opens at step 1 of 5', await step1.isVisible())
  await page.screenshot({
    path: 'test-results/owner-riley-tour-step1.png',
    fullPage: false,
  })

  // Next → step 2.
  await step1.getByRole('button', { name: /Next/ }).click({ force: true })
  const step2 = page.locator(
    '[role="dialog"][aria-label*="Owner tour step 2 of 5"]',
  )
  await step2.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Next advances to step 2 of 5', await step2.isVisible())

  // Back → step 1.
  await step2.getByRole('button', { name: /Back/ }).click({ force: true })
  await step1.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Back returns to step 1 of 5', await step1.isVisible())

  // Walk to last step.
  for (let i = 0; i < 4; i++) {
    await page
      .locator('[role="dialog"][aria-label*="Owner tour step"]')
      .getByRole('button', { name: /Next/ })
      .click({ force: true })
  }
  const step5 = page.locator(
    '[role="dialog"][aria-label*="Owner tour step 5 of 5"]',
  )
  await step5.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Walking Next four times reaches step 5 of 5', await step5.isVisible())
  const doneBtn = step5.getByRole('button', { name: /Done/ })
  check('Final step shows a Done button (not Next)', (await doneBtn.count()) === 1)
  await page.screenshot({
    path: 'test-results/owner-riley-tour-step5.png',
    fullPage: false,
  })

  await doneBtn.click({ force: true })
  await step5.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {})
  const tourCountAfterDone = await page
    .locator('[role="dialog"][aria-label*="Owner tour step"]')
    .count()
  check(
    'Tapping Done dismisses the owner tour overlay',
    tourCountAfterDone === 0,
    `${tourCountAfterDone} step dialogs still visible`,
  )

  await browser.close()
} finally {
  // ---- Cleanup ----
  try {
    if (userId) {
      if (createdAdminLink) {
        await admin
          .from('campground_admins')
          .delete()
          .eq('user_id', userId)
      }
      await admin.from('legal_acks').delete().eq('user_id', userId)
      // profiles cascade-deletes when the auth user is removed.
      await admin.auth.admin.deleteUser(userId)
      console.log(`✓ cleaned up test user ${userId}`)
    }
  } catch (e) {
    console.warn(`cleanup error (non-fatal): ${e.message}`)
  }
}

console.log()
if (!pass) {
  console.error('❌ one or more checks failed')
  process.exit(1)
}
console.log('🎉 all Owner Riley checks passed')

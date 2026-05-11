#!/usr/bin/env node
//
// E2E test: tapping the Riley mascot on /home surfaces two bubbles
// (🗺️ Take a Tour, 💬 Chat with Riley), each of which opens its own
// surface. Replaces the older help-tab test — Riley is now the single
// entry point for both the tour and the chat.
//
// Approach:
//   1. Admin-create a throwaway guest user with email_confirm=true so
//      sign-in works without a Mailosaur round-trip.
//   2. Seed legal_acks so the (app) layout's consent gate passes.
//      (The active-check-in gate that the previous test required is
//      gone — Riley's chat is now available to any signed-in user.)
//   3. Drive Playwright through /login with that user's password.
//   4. Land on /home and walk Riley's UX:
//        - AppNav is back to 7 tabs (no Help)
//        - Riley mascot is present in bottom-right
//        - Tap Riley → "Take a Tour" + "Chat with Riley" bubbles
//        - "Chat with Riley" → chat panel opens (aria "Chat with Riley 👋")
//        - "Take a Tour" → tour overlay opens, Next/Back advances steps
//   5. Tear everything down in finally{}.
//
// Run: node scripts/test-riley-popup-on-home.mjs
// CI:  triggered by .github/workflows/smoke-riley.yml on every
//      successful non-Production Vercel deployment_status.

import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SITE = process.env.SMOKE_SITE_URL ?? 'https://www.getroadwave.com'

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
const email = `rileytest_${stamp}@f8yonvvh.mailosaur.net`
const password = `Roadwave-Test-${crypto.randomBytes(6).toString('hex')}!`

let userId = null
let createdProfile = false

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

  // The handle_new_user trigger should have seeded profiles. Verify
  // and create one if not (defense in depth).
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) {
    await admin.from('profiles').insert({ id: userId, role: 'guest' })
    createdProfile = true
    console.log(`✓ inserted profiles row`)
  } else {
    console.log(`✓ profiles row exists (role=${profile.role})`)
  }

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

  // ---- 3. Drive Playwright through /login ----
  // When the target is a Vercel preview URL, the project's Deployment
  // Protection blocks anonymous traffic with a Vercel SSO login page.
  // VERCEL_AUTOMATION_BYPASS_SECRET (configured in Vercel project
  // settings → Deployment Protection → Protection Bypass for
  // Automation) lets us bypass that gate by sending the header on
  // every request. The header is harmless when hitting production
  // (getroadwave.com isn't protected).
  const browser = await chromium.launch()
  const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    ? {
        'x-vercel-protection-bypass':
          process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        // Tell Vercel to set a cookie so client-side fetches /api/*
        // stay authenticated through redirects without re-checking
        // the header every hop.
        'x-vercel-set-bypass-cookie': 'true',
      }
    : undefined
  const ctx = await browser.newContext({ extraHTTPHeaders })
  const page = await ctx.newPage()

  await page.goto(`${SITE}/login`, { waitUntil: 'networkidle' })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await Promise.all([
    page.waitForURL(/\/(home|owner|verify|consent)/, { timeout: 20_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ])
  console.log(`landed at ${page.url()}`)

  // Guest role → /home. If we ended elsewhere, navigate explicitly.
  if (!page.url().endsWith('/home')) {
    await page.goto(`${SITE}/home`, { waitUntil: 'networkidle' })
  }

  check('authed /home (not /login)', !page.url().includes('/login'), page.url())

  mkdirSync('test-results', { recursive: true })

  // ---- 4. AppNav: 7 tabs, no Help ----
  await page.waitForSelector('nav ul li')
  const navTexts = await page.locator('nav ul li').allTextContents()
  const tabs = navTexts.map((t) => t.trim()).filter(Boolean)
  console.log(`nav tabs (${tabs.length}): ${JSON.stringify(tabs)}`)

  check('AppNav has exactly 7 tabs', tabs.length === 7, `got ${tabs.length}`)
  check('AppNav does not contain a Help tab', !tabs.includes('Help'))

  // ---- 5. Riley mascot present ----
  const rileyBtn = page.locator('button[aria-label="Open Riley menu"]')
  check('Riley mascot present in bottom-right', (await rileyBtn.count()) === 1)

  // ---- 6. Tap Riley → two-bubble popup ----
  await rileyBtn.click()
  const popup = page.locator('[role="dialog"][aria-label="Riley menu"]')
  let popupOpened = false
  try {
    await popup.waitFor({ state: 'visible', timeout: 4000 })
    popupOpened = true
  } catch {
    await page.screenshot({
      path: 'test-results/riley-popup-failed.png',
      fullPage: false,
    })
  }
  check('Riley popup opens', popupOpened)

  const takeTourBtn = popup.getByRole('button', { name: /Take a Tour/ })
  const chatBtn = popup.getByRole('button', { name: /Chat with Riley/ })
  check('Take a Tour bubble present', (await takeTourBtn.count()) === 1)
  check('Chat with Riley bubble present', (await chatBtn.count()) === 1)

  await page.screenshot({
    path: 'test-results/riley-popup-bubbles.png',
    fullPage: false,
  })

  // ---- 7. "Chat with Riley" opens the chat panel ----
  // force: true bypasses Playwright's stability check. The popup buttons
  // sit inside a fixed-position div with subtle transition-colors hover
  // styles, which is enough for Playwright to occasionally flag the
  // element as "not stable" even though no layout is moving.
  await chatBtn.click({ force: true })
  const chatPanel = page.locator('[role="dialog"][aria-label="Chat with Riley 👋"]')
  let chatOpened = false
  try {
    await chatPanel.waitFor({ state: 'visible', timeout: 4000 })
    chatOpened = true
  } catch {
    await page.screenshot({
      path: 'test-results/riley-chat-open-failed.png',
      fullPage: false,
    })
  }
  check('Chat with Riley opens the chat panel', chatOpened)
  await page.screenshot({
    path: 'test-results/riley-chat-open.png',
    fullPage: false,
  })

  // While the chat panel is open, the Riley mascot button should be
  // hidden — otherwise it overlaps the chat input area.
  const rileyHiddenWhileChatOpen =
    (await page.locator('button[aria-label="Open Riley menu"]').count()) === 0 &&
    (await page.locator('button[aria-label="Close Riley menu"]').count()) === 0
  check(
    'Riley mascot is hidden while chat panel is open',
    rileyHiddenWhileChatOpen,
  )

  // Close the chat panel.
  await chatPanel.getByRole('button', { name: 'Close' }).click({ force: true })
  await chatPanel.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {})
  check(
    'Chat panel dismisses on Close',
    (await chatPanel.count()) === 0 || !(await chatPanel.isVisible()),
  )

  // After Close, Riley reappears in the bottom-right.
  await page
    .locator('button[aria-label="Open Riley menu"]')
    .waitFor({ state: 'visible', timeout: 4000 })
    .catch(() => {})
  const rileyVisibleAfterClose =
    (await page.locator('button[aria-label="Open Riley menu"]').count()) === 1
  check('Riley mascot reappears after chat closes', rileyVisibleAfterClose)

  // ---- 8. "Take a Tour" opens the tour overlay ----
  // Re-open Riley popup, then click Take a Tour.
  const rileyBtnReopen = page.locator('button[aria-label="Open Riley menu"]')
  await rileyBtnReopen.click()
  await popup.waitFor({ state: 'visible', timeout: 4000 })
  await popup
    .getByRole('button', { name: /Take a Tour/ })
    .click({ force: true })

  const step1 = page.locator(
    '[role="dialog"][aria-label*="Tour step 1 of 5"]',
  )
  await step1.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Tour overlay opens at step 1 of 5', await step1.isVisible())
  await page.screenshot({
    path: 'test-results/riley-tour-step1.png',
    fullPage: false,
  })

  // Next → step 2.
  await step1.getByRole('button', { name: /Next/ }).click({ force: true })
  const step2 = page.locator(
    '[role="dialog"][aria-label*="Tour step 2 of 5"]',
  )
  await step2.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Next advances to step 2 of 5', await step2.isVisible())

  // Back → step 1.
  await step2.getByRole('button', { name: /Back/ }).click({ force: true })
  await step1.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Back returns to step 1 of 5', await step1.isVisible())

  // Walk to the last step and assert the Done button replaces Next.
  for (let i = 0; i < 4; i++) {
    await page
      .locator('[role="dialog"][aria-label*="Tour step"]')
      .getByRole('button', { name: /Next/ })
      .click({ force: true })
  }
  const step5 = page.locator(
    '[role="dialog"][aria-label*="Tour step 5 of 5"]',
  )
  await step5.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  check('Walking Next four times reaches step 5 of 5', await step5.isVisible())
  const doneBtn = step5.getByRole('button', { name: /Done/ })
  check('Final step shows a Done button (not Next)', (await doneBtn.count()) === 1)
  await page.screenshot({
    path: 'test-results/riley-tour-step5.png',
    fullPage: false,
  })

  // Done → tour closes.
  await doneBtn.click({ force: true })
  await step5.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {})
  const tourCountAfterDone = await page
    .locator('[role="dialog"][aria-label*="Tour step"]')
    .count()
  check(
    'Tapping Done dismisses the tour overlay',
    tourCountAfterDone === 0,
    `${tourCountAfterDone} step dialogs still visible`,
  )

  await browser.close()
} finally {
  // ---- Cleanup ----
  try {
    if (userId) {
      await admin.from('legal_acks').delete().eq('user_id', userId)
      if (createdProfile) {
        await admin.from('profiles').delete().eq('id', userId)
      }
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
console.log('🎉 all Riley popup checks passed')

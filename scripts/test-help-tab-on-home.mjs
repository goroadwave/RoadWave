#!/usr/bin/env node
//
// E2E test: the guest Help tab shows up on /home (replacing the
// floating button that overlapped with the Riley mascot).
//
// Approach:
//   1. Admin-create a throwaway guest user with email_confirm=true so
//      sign-in works without a Mailosaur round-trip.
//   2. Seed the rows the (app) layout's auth gates require:
//        - legal_acks  (skips the /consent gate)
//        - check_ins   (active row → showGuestSupport=true)
//   3. Drive Playwright through /login with that user's password.
//   4. Land on /home, inspect AppNav.
//   5. Assert: 'Help' tab present, immediately after Meetups; no
//      floating support button; clicking Help opens the chat panel.
//   6. Tear everything down in finally{}.

import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SITE = 'https://www.getroadwave.com'
const CAMPGROUND_ID = '199f8d72-f761-493b-9fac-8b38d5380a59' // RoadWave HQ

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
const email = `helptest_${stamp}@f8yonvvh.mailosaur.net`
const password = `Roadwave-Test-${crypto.randomBytes(6).toString('hex')}!`

let userId = null
let checkInId = null
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

  // The handle_new_user trigger should have seeded profiles.{id, role=guest}
  // — but verify, and create one if not (defense in depth).
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) {
    await admin
      .from('profiles')
      .insert({ id: userId, role: 'guest' })
    createdProfile = true
    console.log(`✓ inserted profiles row`)
  } else {
    console.log(`✓ profiles row exists (role=${profile.role})`)
  }

  // ---- 2. Seed legal_acks + an active check-in ----
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

  const { data: ci, error: ciError } = await admin
    .from('check_ins')
    .insert({
      profile_id: userId,
      campground_id: CAMPGROUND_ID,
      status: 'active',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()
  if (ciError || !ci) throw new Error(`check_ins insert failed: ${ciError?.message}`)
  checkInId = ci.id
  console.log(`✓ seeded active check-in ${checkInId}`)

  // ---- 3. Drive Playwright through /login ----
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(`${SITE}/login`, { waitUntil: 'networkidle' })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await Promise.all([
    page.waitForURL(/\/(home|owner|verify|consent)/, { timeout: 20_000 }),
    page.getByRole('button', { name: /^Sign in$/ }).click(),
  ])
  console.log(`landed at ${page.url()}`)

  // The post-auth helper sends 'guest' role → /home. If we ended up
  // elsewhere (e.g. /verify), navigate explicitly to /home.
  if (!page.url().endsWith('/home')) {
    await page.goto(`${SITE}/home`, { waitUntil: 'networkidle' })
  }

  check('authed /home (not /login)', !page.url().includes('/login'), page.url())

  // ---- 4. Inspect AppNav ----
  await page.waitForSelector('nav ul li')
  const navTexts = await page.locator('nav ul li').allTextContents()
  const tabs = navTexts.map((t) => t.trim()).filter(Boolean)
  console.log(`nav tabs (${tabs.length}): ${JSON.stringify(tabs)}`)

  check('Help tab present in AppNav', tabs.includes('Help'))
  const meetupsIdx = tabs.indexOf('Meetups')
  const helpIdx = tabs.indexOf('Help')
  // With Help appended as the 8th cell in a 4-column grid, it lands
  // in row 2 col 4 — same column as Meetups in row 1 col 4. The
  // index check (meetups@3, help@7, difference of 4) is the
  // arithmetic restatement of "directly below".
  check(
    'Help tab is at the last position (row 2 col 4 — directly below Meetups)',
    meetupsIdx !== -1 && helpIdx === tabs.length - 1 && helpIdx - meetupsIdx === 4,
    `meetups@${meetupsIdx}, help@${helpIdx}, length=${tabs.length}`,
  )

  // No floating support button in the bottom-right.
  const floatingCount = await page
    .locator('button[aria-label="Open RoadWave support chat"]')
    .count()
  check(
    'no floating support button in bottom-right',
    floatingCount === 0,
    `found ${floatingCount}`,
  )

  mkdirSync('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/help-tab-home.png', fullPage: false })
  console.log(`screenshot → test-results/help-tab-home.png`)

  // ---- 5. Click Help, verify panel opens ----
  await page.getByRole('button', { name: 'Help' }).first().click()
  await page.waitForTimeout(400)
  const dialogVisible = await page
    .locator('[role="dialog"][aria-label="Ask RoadWave 👋"]')
    .isVisible()
  check('clicking Help opens the chat panel', dialogVisible)
  await page.screenshot({
    path: 'test-results/help-tab-home-open.png',
    fullPage: false,
  })

  await browser.close()
} finally {
  // ---- 6. Cleanup ----
  try {
    if (checkInId) {
      await admin.from('check_ins').delete().eq('id', checkInId)
    }
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
console.log(pass ? '✅ All checks passed.' : '❌ Some checks failed.')
process.exit(pass ? 0 : 1)

#!/usr/bin/env node
//
// Capture a side-by-side preview of the Confirm signup email.
//
//   test-results/email-preview.png        — what Mailosaur received from a
//                                           real test signup. Reflects the
//                                           email template currently
//                                           pasted into Supabase Dashboard
//                                           → Auth → Email Templates →
//                                           Confirm signup.
//
//   test-results/email-preview-local.png  — the local repo template
//                                           (supabase/templates/confirmation.html)
//                                           rendered as it would appear
//                                           after Supabase has been
//                                           updated to match.
//
// The two will differ until you paste the new HTML into Supabase. After
// that, both files will be identical (modulo Supabase variable
// substitution).
//
// Usage:
//   node scripts/capture-email-preview.mjs

import path from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import Mailosaur from 'mailosaur'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

const MAILOSAUR_API_KEY = process.env.MAILOSAUR_API_KEY
const MAILOSAUR_SERVER_ID = process.env.MAILOSAUR_SERVER_ID
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!MAILOSAUR_API_KEY || !MAILOSAUR_SERVER_ID) {
  console.error('Missing MAILOSAUR_API_KEY / MAILOSAUR_SERVER_ID in .env.test')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}

const SITE = 'https://www.getroadwave.com'
const VIEWPORT = { width: 720, height: 1100 }

const mailosaur = new Mailosaur(MAILOSAUR_API_KEY)
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

mkdirSync('test-results', { recursive: true })

const email = `testuser_${Date.now()}@${MAILOSAUR_SERVER_ID}.mailosaur.net`
const username = `tu_${Date.now()}`.slice(0, 24)
const password = 'testpassword12345!'

console.log(`[1/4] launching browser`)
const browser = await chromium.launch()

try {
  // ----------------------------------------------------------------
  // 1. Render the local template (the new design) for reference.
  // ----------------------------------------------------------------
  console.log(
    `[2/4] rendering local supabase/templates/confirmation.html → test-results/email-preview-local.png`,
  )
  const localHtml = readFileSync(
    'supabase/templates/confirmation.html',
    'utf8',
  )
    .replace(
      /\{\{\s*\.ConfirmationURL\s*\}\}/g,
      `${SITE}/auth/confirm?token_hash=sample-token&type=signup`,
    )
    .replace(/\{\{\s*\.Email\s*\}\}/g, email)
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT })
    const p = await ctx.newPage()
    await p.setContent(localHtml, { waitUntil: 'networkidle' })
    await p.screenshot({
      path: 'test-results/email-preview-local.png',
      fullPage: true,
    })
    await ctx.close()
    console.log(`      saved test-results/email-preview-local.png`)
  }

  // ----------------------------------------------------------------
  // 2. Trigger a real signup so the live Custom-SMTP path fires.
  // ----------------------------------------------------------------
  console.log(`[3/4] triggering live signup email=${email}`)
  const signupCtx = await browser.newContext()
  const sp = await signupCtx.newPage()
  await sp.goto(`${SITE}/signup`)
  await sp.fill('input[name="username"]', username)
  await sp.fill('input[name="email"]', email)
  await sp.fill('input[name="password"]', password)
  await sp.waitForSelector('text=Available.', { timeout: 15_000 })
  await sp.check('input[name="confirm_18"]')
  await sp.check('input[name="accept"]')
  await sp.check('input[name="accept_community_rules"]')
  await sp.getByRole('button', { name: /Create account/i }).click()
  await sp.waitForURL(/\/(verify|home|profile|consent)/i, { timeout: 30_000 })
  console.log(`      post-signup URL=${sp.url()}`)
  await signupCtx.close()

  // ----------------------------------------------------------------
  // 3. Wait for the live email and screenshot the body from Mailosaur.
  // ----------------------------------------------------------------
  console.log(`      waiting up to 60s for confirmation email`)
  let message = null
  const start = Date.now()
  while (Date.now() - start < 60_000) {
    const list = await mailosaur.messages.list(MAILOSAUR_SERVER_ID, {
      sentTo: email,
    })
    if (list.items && list.items.length > 0) {
      message = await mailosaur.messages.getById(list.items[0].id)
      break
    }
    await new Promise((r) => setTimeout(r, 2_000))
  }
  if (!message) throw new Error('timed out waiting for live email')
  console.log(
    `      received subject="${message.subject}" received=${message.received}`,
  )

  console.log(
    `[4/4] rendering live email body → test-results/email-preview.png`,
  )
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT })
    const p = await ctx.newPage()
    await p.setContent((message.html && message.html.body) || '', {
      waitUntil: 'networkidle',
    })
    await p.screenshot({
      path: 'test-results/email-preview.png',
      fullPage: true,
    })
    await ctx.close()
    console.log(`      saved test-results/email-preview.png`)
  }
} finally {
  // Always clean up the auth.user we created via the live signup.
  try {
    const { data } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })
    const user = data && data.users && data.users.find((u) => u.email === email)
    if (user) {
      await admin.auth.admin.deleteUser(user.id)
      console.log(`[cleanup] deleted auth.user ${user.id} (${email})`)
    } else {
      console.log(`[cleanup] no auth.user found for ${email}`)
    }
  } catch (e) {
    console.log(`[cleanup] error: ${e.message}`)
  }
  await browser.close()
}

console.log('\nDone.')
console.log('  test-results/email-preview.png        ← live email (current Supabase template)')
console.log('  test-results/email-preview-local.png  ← new design (the file you just pushed)')
console.log(
  '\nThe two will be identical once you paste the contents of\n' +
    'supabase/templates/confirmation.html into Supabase Dashboard\n' +
    '→ Authentication → Email Templates → Confirm signup.',
)

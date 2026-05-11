#!/usr/bin/env node
//
// Prompt-behavior tests for both Riley personas.
//
// The structural smoke tests (test-riley-popup-on-home,
// test-owner-riley-on-dashboard) verify the UI renders correctly.
// This test verifies the *system prompts* — i.e. that the model
// actually:
//   1. Refuses to discuss the other audience's topics.
//   2. Never says "visit getroadwave.com" — directions reference the
//      nav tab on the current page instead.
//   3. References the right nav tab when asked a routine "how do I
//      do X" question.
//
// Implementation: sign each persona in via Playwright (which gives us
// a real Supabase session cookie), then call /api/support-chat
// through the browser context's request fixture so the cookie rides
// along. Inspect the raw model text for forbidden / required tokens.
//
// LLM responses are probabilistic — assertions are deliberately
// lenient (token-level grep), not exact match.
//
// Run: node scripts/test-riley-prompt-behavior.mjs

import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SITE = process.env.SMOKE_SITE_URL ?? 'https://www.getroadwave.com'
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
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? '\n     → ' + detail : ''}`)
  if (!ok) pass = false
}

const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      'x-vercel-protection-bypass':
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : undefined

// ----------------------------------------------------------------------------
// helpers

const forbiddenForBothAudiences = [
  // The big one — system prompt explicitly forbids it.
  /visit\s+getroadwave\.com/i,
  /go\s+to\s+getroadwave\.com/i,
]

async function ask(ctx, { audience, pathname, content }) {
  const res = await ctx.request.post(`${SITE}/api/support-chat`, {
    data: {
      audience,
      messages: [{ role: 'user', content }],
      pathname,
    },
    timeout: 60_000,
  })
  if (!res.ok()) {
    throw new Error(
      `support-chat ${audience} returned ${res.status()}: ${await res.text()}`,
    )
  }
  const json = await res.json()
  return String(json.content ?? '')
}

function assertNoForbidden(label, text, extra = []) {
  const patterns = [...forbiddenForBothAudiences, ...extra]
  const hit = patterns.find((p) => p.test(text))
  check(
    label,
    !hit,
    hit ? `forbidden pattern ${hit} matched in: ${snippet(text)}` : '',
  )
}

function assertMentions(label, text, patterns) {
  const missing = patterns.find((p) => !p.test(text))
  check(
    label,
    !missing,
    missing ? `expected ${missing} in: ${snippet(text)}` : '',
  )
}

function assertAnyMatch(label, text, patterns, contextLine) {
  const ok = patterns.some((p) => p.test(text))
  check(
    label,
    ok,
    ok ? '' : `${contextLine} — none of ${patterns} matched: ${snippet(text)}`,
  )
}

function snippet(text, max = 220) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max) + '…' : flat
}

// ----------------------------------------------------------------------------
// setup: throwaway camper + owner

const stamp = Date.now()
const camperEmail = `prompttest_camper_${stamp}@f8yonvvh.mailosaur.net`
const ownerEmail = `prompttest_owner_${stamp}@f8yonvvh.mailosaur.net`
const password = `Roadwave-Test-${crypto.randomBytes(6).toString('hex')}!`

let camperId = null
let ownerId = null
let ownerAdminLink = false

const legalAck = {
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
}

try {
  // ---- camper user ----
  {
    const { data, error } = await admin.auth.admin.createUser({
      email: camperEmail,
      password,
      email_confirm: true,
    })
    if (error || !data?.user) throw new Error(`createUser camper: ${error?.message}`)
    camperId = data.user.id
    console.log(`✓ created camper ${camperId}`)
  }
  await admin.from('legal_acks').insert({ ...legalAck, user_id: camperId })

  // ---- owner user ----
  {
    const { data, error } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password,
      email_confirm: true,
    })
    if (error || !data?.user) throw new Error(`createUser owner: ${error?.message}`)
    ownerId = data.user.id
    console.log(`✓ created owner ${ownerId}`)
  }
  await admin.from('profiles').update({ role: 'owner' }).eq('id', ownerId)
  await admin.from('legal_acks').insert({ ...legalAck, user_id: ownerId })
  await admin
    .from('campground_admins')
    .insert({ user_id: ownerId, campground_id: CAMPGROUND_ID })
  ownerAdminLink = true
  console.log(`✓ owner seeded with role + admin link`)

  // ----------------------------------------------------------------------
  // CAMPER RILEY tests

  console.log('\n--- CAMPER RILEY ---')
  const browser = await chromium.launch()
  const camperCtx = await browser.newContext({ extraHTTPHeaders })
  const camperPage = await camperCtx.newPage()
  await camperPage.goto(`${SITE}/login`, { waitUntil: 'networkidle' })
  await camperPage.locator('input[name="email"]').fill(camperEmail)
  await camperPage.locator('input[name="password"]').fill(password)
  await Promise.all([
    camperPage
      .waitForURL((u) => !u.toString().endsWith('/login'), { timeout: 20_000 })
      .catch(() => {}),
    camperPage.getByRole('button', { name: /^Sign in$/ }).click(),
  ])
  if (camperPage.url().includes('/login')) {
    throw new Error(`camper login stayed on /login: ${camperPage.url()}`)
  }
  console.log(`  camper signed in → ${camperPage.url()}`)

  // 1. Page-aware direction: ask a question while on /checkin, expect
  //    the answer to reference the Check in tab or the QR action — and
  //    not "visit getroadwave.com".
  {
    const reply = await ask(camperCtx, {
      audience: 'guest',
      pathname: '/checkin',
      content: 'How do I check in?',
    })
    console.log(`\n  Q: "How do I check in?"  (on /checkin)\n  R: ${snippet(reply, 280)}`)
    assertNoForbidden('camper: no "visit getroadwave.com"', reply)
    assertAnyMatch(
      'camper: answer references the check-in flow (QR scan / Check in)',
      reply,
      [/QR/i, /scan/i, /\bcheck[\s-]?in\b/i],
      'expected QR-scan / check-in language',
    )
  }

  // 2. Adversarial cross-audience: ask an owner question, expect a
  //    redirect away from the topic rather than instructions on QR
  //    generation, dashboard nav, billing, etc.
  {
    const reply = await ask(camperCtx, {
      audience: 'guest',
      pathname: '/home',
      content: 'How do I generate a QR code for my campground and set up the owner dashboard?',
    })
    console.log(`\n  Q: "How do I generate a QR code for my campground..."\n  R: ${snippet(reply, 280)}`)
    assertNoForbidden('camper: no "visit getroadwave.com" on owner-topic question', reply)
    // Should NOT confidently explain owner-side mechanics. Forbid the
    // smoking-gun phrases an actual owner answer would carry.
    assertNoForbidden(
      'camper: does not coach owner-side workflows',
      reply,
      [
        /\bdashboard\b/i,
        /\bMarketing\s+tab\b/i,
        /\bBilling\b/i,
        /\bsign\s+up\s+as\s+an\s+owner\b/i,
      ],
    )
  }

  // 3. Off-topic question: expect a gentle redirect to RoadWave.
  {
    const reply = await ask(camperCtx, {
      audience: 'guest',
      pathname: '/home',
      content: "What's the weather forecast for tomorrow?",
    })
    console.log(`\n  Q: "What's the weather forecast for tomorrow?"\n  R: ${snippet(reply, 280)}`)
    assertNoForbidden('camper: no "visit getroadwave.com" on off-topic question', reply)
    assertAnyMatch(
      'camper: redirects off-topic question back to RoadWave',
      reply,
      [/RoadWave/i, /help you/i, /not\s+(my|something)/i, /can'?t\s+help/i],
      'expected a RoadWave-redirect cue',
    )
  }

  // ----------------------------------------------------------------------
  // OWNER RILEY tests

  console.log('\n--- OWNER RILEY ---')
  const ownerCtx = await browser.newContext({ extraHTTPHeaders })
  const ownerPage = await ownerCtx.newPage()
  await ownerPage.goto(`${SITE}/owner/login`, { waitUntil: 'networkidle' })
  await ownerPage.locator('input[name="email"]').fill(ownerEmail)
  await ownerPage.locator('input[name="password"]').fill(password)
  await Promise.all([
    ownerPage
      .waitForURL((u) => !u.toString().includes('/owner/login'), {
        timeout: 20_000,
      })
      .catch(() => {}),
    ownerPage.getByRole('button', { name: /^Sign in$/ }).click(),
  ])
  if (ownerPage.url().includes('/owner/login')) {
    throw new Error(`owner login stayed on /owner/login: ${ownerPage.url()}`)
  }
  console.log(`  owner signed in → ${ownerPage.url()}`)

  // 1. Page-aware direction: on /owner/bulletin, ask how to post an
  //    update — expect a reference to the Bulletin tab or its action,
  //    no "visit getroadwave.com".
  {
    const reply = await ask(ownerCtx, {
      audience: 'owner',
      pathname: '/owner/bulletin',
      content: 'How do I post an update for my guests?',
    })
    console.log(`\n  Q: "How do I post an update for my guests?"  (on /owner/bulletin)\n  R: ${snippet(reply, 280)}`)
    assertNoForbidden('owner: no "visit getroadwave.com"', reply)
    assertAnyMatch(
      'owner: answer references the Bulletin surface',
      reply,
      [/\bbulletin\b/i, /\bpost\b/i, /\bupdate\b/i, /\bannouncement\b/i],
      'expected bulletin / post / update language',
    )
  }

  // 2. Adversarial cross-audience: ask a camper question. Owner Riley
  //    should NOT explain the 24-hour visibility, waves, privacy modes
  //    or other guest-side mechanics.
  {
    const reply = await ask(ownerCtx, {
      audience: 'owner',
      pathname: '/owner/dashboard',
      content: 'How can I see other campers near me and send them a wave?',
    })
    console.log(`\n  Q: "How can I see other campers near me and send them a wave?"\n  R: ${snippet(reply, 280)}`)
    assertNoForbidden(
      'owner: no "visit getroadwave.com" on camper-topic question',
      reply,
    )
    assertNoForbidden(
      'owner: does not coach camper-side mechanics (waves / 24h / privacy modes)',
      reply,
      [
        /\bsend\s+a\s+wave\b/i,
        /\b24[\s-]?hour\b/i,
        /\bprivacy\s+mode\b/i,
        /\bvisible\s+for\s+24\b/i,
      ],
    )
  }

  // 3. Off-topic: expect redirect to running the RoadWave campground.
  {
    const reply = await ask(ownerCtx, {
      audience: 'owner',
      pathname: '/owner/dashboard',
      content: 'Who is the president of the United States?',
    })
    console.log(`\n  Q: "Who is the president of the United States?"\n  R: ${snippet(reply, 280)}`)
    assertNoForbidden('owner: no "visit getroadwave.com" on off-topic question', reply)
    assertAnyMatch(
      'owner: redirects off-topic question back to RoadWave',
      reply,
      [/RoadWave/i, /campground/i, /not\s+(my|something)/i, /can'?t\s+help/i],
      'expected a RoadWave-redirect cue',
    )
  }

  await browser.close()
} finally {
  try {
    if (ownerId) {
      if (ownerAdminLink) {
        await admin.from('campground_admins').delete().eq('user_id', ownerId)
      }
      await admin.from('legal_acks').delete().eq('user_id', ownerId)
      await admin.auth.admin.deleteUser(ownerId)
      console.log(`✓ cleaned up owner ${ownerId}`)
    }
    if (camperId) {
      await admin.from('legal_acks').delete().eq('user_id', camperId)
      await admin.auth.admin.deleteUser(camperId)
      console.log(`✓ cleaned up camper ${camperId}`)
    }
  } catch (e) {
    console.warn(`cleanup error (non-fatal): ${e.message}`)
  }
}

console.log()
if (!pass) {
  console.error('❌ one or more prompt-behavior checks failed')
  process.exit(1)
}
console.log('🎉 all Riley prompt-behavior checks passed')

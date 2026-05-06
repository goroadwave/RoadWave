#!/usr/bin/env node
//
// Reproduces what /owner/marketing's Copy HTML / Copy Plain Text
// buttons put on the clipboard for a real campground, then asserts
// every URL that appears in the visible payload is the clean
// /campground/<slug> form — no /checkin?token=… anywhere.
//
// The functions below are line-for-line copies of the builders in
// src/components/owner/marketing-kit.tsx so this script never silently
// drifts from the live behavior. If marketing-kit changes, re-paste.

import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase admin creds in .env.local')
  process.exit(1)
}

const email = process.argv[2] ?? 'markhalesmith@gmail.com'
const SITE = 'https://www.getroadwave.com'

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Resolve the user → admin → campground → token (same path
// /owner/marketing/page.tsx uses on the server).
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
const user = list.users.find((u) => u.email === email)
if (!user) {
  console.error(`No auth.user for ${email}`)
  process.exit(2)
}
const { data: link } = await admin
  .from('campground_admins')
  .select('campground_id')
  .eq('user_id', user.id)
  .maybeSingle()
if (!link) {
  console.error(`No campground_admins row for ${email}`)
  process.exit(3)
}
const { data: cg } = await admin
  .from('campgrounds')
  .select('id, name, slug, city, region')
  .eq('id', link.campground_id)
  .single()
const { data: tokenRow } = await admin
  .from('campground_qr_tokens')
  .select('token')
  .eq('campground_id', cg.id)
  .maybeSingle()

const checkInUrl = `${SITE}/campground/${cg.slug}?token=${tokenRow.token}` // for QR pixels
const campgroundPageUrl = `${SITE}/campground/${cg.slug}`                   // for everything visible

console.log(`campground   = ${cg.name} (slug=${cg.slug})`)
console.log(`token        = ${tokenRow.token}`)
console.log(`checkInUrl   = ${checkInUrl}        ← QR pixels only`)
console.log(`campgroundUrl= ${campgroundPageUrl} ← every visible link\n`)

// --- mirror of buildWelcomeEmailHtml in marketing-kit.tsx ---
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function buildWelcomeEmailHtml({ qrDataUrl, campgroundName, campgroundUrl }) {
  const safeName = escapeHtml(campgroundName)
  const safeHref = escapeHtml(campgroundUrl)
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;line-height:1.6;font-size:15px;max-width:560px;">
  <p>Welcome to <strong>${safeName}</strong>!</p>
  <p>We use RoadWave so our guests can see campground updates, find activities, and optionally connect with fellow campers &mdash; privately and without sharing exact site numbers.</p>
  <p>Scan the QR code below or <a href="${safeHref}" target="_blank" rel="noopener" style="color:#F5A623;font-weight:600;text-decoration:none;">view our campground page &rarr;</a> to get started. It&rsquo;s free and takes 30 seconds.</p>
  <p style="text-align:center;padding:18px 0;">
    <a href="${safeHref}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;border:0;">
      <img src="${qrDataUrl}" alt="${safeName} RoadWave QR" width="220" height="220" style="display:inline-block;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;" />
    </a>
  </p>
  <p style="font-size:12px;color:#6b7280;">
    Private by design. No exact site numbers. No public group chats. No pressure.
  </p>
</div>`
}
function buildWelcomeEmailText({ campgroundName, campgroundUrl }) {
  return [
    `Welcome to ${campgroundName}!`,
    '',
    'We use RoadWave so our guests can see campground updates, find activities, and optionally connect with fellow campers — privately and without sharing exact site numbers.',
    '',
    `Scan the QR code on our welcome card or visit ${campgroundUrl} to get started. It's free and takes 30 seconds.`,
    '',
    'Private by design. No exact site numbers. No public group chats. No pressure.',
  ].join('\n')
}

const html = buildWelcomeEmailHtml({
  qrDataUrl: 'data:image/png;base64,…(omitted for output)…',
  campgroundName: cg.name,
  campgroundUrl: campgroundPageUrl,
})
const plain = buildWelcomeEmailText({
  campgroundName: cg.name,
  campgroundUrl: campgroundPageUrl,
})

console.log('=== HTML payload ===')
console.log(html)
console.log('\n=== Plain-text payload ===')
console.log(plain)
console.log('\n=== Assertions ===')

let pass = true
function assert(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`)
  if (!ok) pass = false
}

assert(
  'HTML has no /checkin?token= anywhere',
  !html.includes('/checkin?token=') && !html.includes('checkin?token'),
)
assert(
  'HTML has no ?token= query string in any href',
  !/href="[^"]*\?token=/.test(html),
)
assert(
  `HTML href points at ${campgroundPageUrl}`,
  html.includes(`href="${campgroundPageUrl}"`),
)
assert(
  'Plain text has no /checkin?token= anywhere',
  !plain.includes('/checkin?token=') && !plain.includes('checkin?token'),
)
assert(
  'Plain text has no ?token= anywhere',
  !plain.includes('?token='),
)
assert(
  `Plain text contains ${campgroundPageUrl}`,
  plain.includes(campgroundPageUrl),
)

process.exit(pass ? 0 : 1)

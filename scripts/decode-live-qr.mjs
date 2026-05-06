#!/usr/bin/env node
//
// Decode the QR code rendered on a live production campground page so we
// can see what's actually encoded — independent of source-code claims.
//
// Picks one real campground (the first one with a campground_qr_tokens
// row) via the Supabase admin client, fetches the public
// /campground/<slug> page over real production HTTPS, locates the
// inline-data-URL QR <img>, and decodes it via Chromium's built-in
// BarcodeDetector. Prints the decoded payload and compares against the
// URL we expected the source to produce.
//
// Usage:
//   node scripts/decode-live-qr.mjs

import path from 'node:path'
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SITE = 'https://www.getroadwave.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase admin creds in .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1. Pick a real campground with a QR token so we can compare actual vs
//    expected. Limit 1 — we just need one concrete sample.
const { data: tokens, error: tokenErr } = await admin
  .from('campground_qr_tokens')
  .select('campground_id, token')
  .limit(1)

if (tokenErr) {
  console.error('Could not query campground_qr_tokens:', tokenErr.message)
  process.exit(1)
}
if (!tokens || tokens.length === 0) {
  console.error('No campground_qr_tokens rows found — nothing to test against')
  process.exit(1)
}

const tokenRow = tokens[0]
const { data: cg, error: cgErr } = await admin
  .from('campgrounds')
  .select('id, name, slug')
  .eq('id', tokenRow.campground_id)
  .single()

if (cgErr || !cg) {
  console.error('Could not load campground:', cgErr?.message)
  process.exit(1)
}

const expectedUrl = `${SITE}/checkin?token=${tokenRow.token}`
const pageUrl = `${SITE}/campground/${cg.slug}`

console.log('Sample campground:')
console.log(`  name      : ${cg.name}`)
console.log(`  slug      : ${cg.slug}`)
console.log(`  token     : ${tokenRow.token}`)
console.log(`  page url  : ${pageUrl}`)
console.log(`  expected  : ${expectedUrl}`)
console.log()

// 2. Fetch the page in a real browser, find the QR image, decode it.
console.log('Launching headless Chromium…')
const browser = await chromium.launch()
try {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(pageUrl, { waitUntil: 'networkidle' })

  const qrImg = page.locator('img[alt^="Scan to check in"]').first()
  await qrImg.waitFor({ state: 'visible', timeout: 15_000 })

  // Pull the data-URL src out of the DOM in the browser context.
  const srcInfo = await page.evaluate(() => {
    const img = document.querySelector('img[alt^="Scan to check in"]')
    if (!img) return { error: 'QR <img> not found in DOM' }
    return { src: img.src, alt: img.alt }
  })

  if (srcInfo.error) {
    console.error('FAILED:', srcInfo.error)
    process.exit(2)
  }
  if (!srcInfo.src.startsWith('data:image/png;base64,')) {
    console.error(
      'FAILED: QR src is not a base64 PNG data URL. Got prefix:',
      srcInfo.src.slice(0, 60),
    )
    process.exit(2)
  }
  console.log(`QR <img> alt="${srcInfo.alt}", src bytes=${srcInfo.src.length}`)

  // Decode PNG → RGBA pixels → jsQR.
  const base64 = srcInfo.src.split(',')[1]
  const pngBuffer = Buffer.from(base64, 'base64')
  const png = PNG.sync.read(pngBuffer)
  const code = jsQR(
    new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.byteLength),
    png.width,
    png.height,
  )

  if (!code) {
    console.error('FAILED: jsQR returned no code')
    process.exit(3)
  }
  const actual = code.data

  console.log('Comparison:')
  console.log(`  actual   : ${actual}`)
  console.log(`  expected : ${expectedUrl}`)
  console.log()

  if (actual === expectedUrl) {
    console.log(
      '✅ MATCH — the live QR encodes the full check-in URL, not a raw UUID.',
    )
  } else if (actual === tokenRow.token) {
    console.log(
      '❌ RAW UUID — the live QR encodes only the token UUID. Source needs fixing.',
    )
    process.exit(4)
  } else {
    console.log(
      '⚠️  DIFFERENT — neither full URL nor raw UUID. See "actual" above.',
    )
    process.exit(5)
  }
} finally {
  await browser.close()
}

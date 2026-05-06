#!/usr/bin/env node
// Hit the campground welcome URL in a fresh, unauthenticated Chromium
// context (the equivalent of an incognito window) and verify a real
// guest would land on the welcome page — not be redirected to
// /checkin?token=.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'https://www.getroadwave.com/campground/test-0c6c67'

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const responses = []
  page.on('response', (r) => responses.push({ status: r.status(), url: r.url() }))
  await page.goto(url, { waitUntil: 'networkidle' })

  console.log(`Hit:  ${url}`)
  console.log(`Final URL after navigation:`)
  console.log(`  ${page.url()}`)

  const redirects = responses.filter((x) => x.status >= 300 && x.status < 400)
  if (redirects.length) {
    console.log(`\nRedirect chain:`)
    for (const r of redirects) console.log(`  ${r.status}  ${r.url}`)
  }

  const h1 = (await page.locator('h1').first().textContent({ timeout: 5000 }).catch(() => '')) ?? ''
  const hasWelcomeTo = await page.locator('text=Welcome to').count()
  const hasCheckInBtn = await page.locator('text=Check In to This Campground').count()
  const hasUpdatesBtn = await page.locator('text=Just See Campground Updates').count()

  console.log(`\nPage state (unauthed visitor):`)
  console.log(`  H1                                = ${JSON.stringify(h1.trim())}`)
  console.log(`  "Welcome to" eyebrow visible      = ${hasWelcomeTo > 0}`)
  console.log(`  "Check In to This Campground" CTA = ${hasCheckInBtn > 0}`)
  console.log(`  "Just See Campground Updates" CTA = ${hasUpdatesBtn > 0}`)

  mkdirSync('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/welcome-page-incognito.png', fullPage: true })
  console.log(`\nScreenshot saved → test-results/welcome-page-incognito.png`)

  if (page.url().includes('/checkin')) {
    console.log(`\n❌ REDIRECTED to /checkin — bug.`)
    process.exit(1)
  }
  if (page.url().includes('/campground/')) {
    console.log(`\n✅ Welcome page rendered as expected for an anonymous guest.`)
  }
} finally {
  await browser.close()
}

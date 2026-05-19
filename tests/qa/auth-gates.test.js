// @ts-check
//
// Production-safe. Verifies that owner and admin protected routes
// redirect anonymous traffic to the correct login page, and that the
// owner sign-out destination param is respected.
//
// These are the surfaces an unauthenticated random visitor could hit
// by guessing URLs — they must NEVER render owner/admin content.

import { expect, test } from '@playwright/test'

const OWNER_PROTECTED = [
  '/owner/dashboard',
  '/owner/setup',
  '/owner/profile',
  '/owner/qr',
  '/owner/billing',
  '/owner/marketing',
  '/owner/messages',
  '/owner/bulletin',
  '/owner/meetups',
  '/owner/analytics',
  '/owner/preview',
]

const ADMIN_PROTECTED = [
  '/admin',
  '/admin/activity',
  '/admin/campgrounds',
  '/admin/users',
  '/admin/safety',
  '/admin/inbox',
  '/admin/qr',
  '/admin/health',
]

const CAMPER_PROTECTED = [
  '/home',
  '/nearby',
  '/waves',
  '/crossed-paths',
  '/meetups',
  '/profile/setup',
  '/settings/privacy',
  '/settings/delete-account',
]

test.describe('Owner-protected routes gate anonymous traffic', () => {
  for (const path of OWNER_PROTECTED) {
    test(`${path} → /owner/login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/owner\/login|\/login/, { timeout: 10_000 })
    })
  }
})

test.describe('Admin-protected routes gate anonymous traffic', () => {
  for (const path of ADMIN_PROTECTED) {
    test(`${path} redirects (or 404s) anon`, async ({ page }) => {
      const resp = await page.goto(path)
      // Admin pages are double-gated: anon hits /login first, then
      // even if logged in as a non-admin, the layout 404s rather than
      // exposing route existence. Both outcomes are acceptable here.
      const url = page.url()
      const matchesGate =
        /\/login/.test(url) ||
        /\/owner\/login/.test(url) ||
        resp?.status() === 404
      expect(matchesGate, `${path} should not render admin content; got ${url} (${resp?.status()})`).toBe(true)
      await expect(page.locator('body')).not.toContainText(
        /admin.*activity|admin.*overview|admin.*dashboard/i,
      )
    })
  }
})

test.describe('Camper-protected routes gate anonymous traffic', () => {
  for (const path of CAMPER_PROTECTED) {
    test(`${path} → /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })
  }
})

test.describe('Owner sign-out lands on owner login when next is passed', () => {
  test('POST /auth/sign-out?next=/owner/login → 303 to /owner/login', async ({
    request,
  }) => {
    const resp = await request.post('/auth/sign-out?next=/owner/login', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    expect(resp.status()).toBe(303)
    expect(resp.headers()['location']).toMatch(/\/owner\/login$/)
  })

  test('POST /auth/sign-out without next → 303 to /', async ({ request }) => {
    const resp = await request.post('/auth/sign-out', {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    expect(resp.status()).toBe(303)
    const location = resp.headers()['location']
    expect(location).toBeTruthy()
    expect(location).toMatch(/^(\/|https?:\/\/)/)
  })
})

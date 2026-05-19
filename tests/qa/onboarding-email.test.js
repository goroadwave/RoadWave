// @ts-check
//
// Wraps the existing scripts/test-onboarding-email-render.mjs render
// assertions inside the Playwright test runner so a single
// `npm run test:qa` exercises them alongside the HTTP tests.
//
// Pure render — no network, no Resend call, no SMTP. Imports the
// production render path directly so future template changes can't
// silently break the owner/guest link separation.

import { expect, test } from '@playwright/test'
import { renderOwnerOnboardingKitEmail } from '../../src/lib/email/owner-onboarding-kit.ts'
import { escapeHtml } from '../../src/lib/email/resend.ts'

const DASHBOARD_URL =
  'https://www.getroadwave.com/auth/sign-in?th=TOKEN_HASH_PLACEHOLDER_ZZZZ&email=owner%40example.com&next=%2Fowner%2Fdashboard'
const GUEST_URL =
  'https://www.getroadwave.com/campground/test-camp?token=00000000-0000-0000-0000-000000000000'

const DASHBOARD_URL_ESC = escapeHtml(DASHBOARD_URL)
const GUEST_URL_ESC = escapeHtml(GUEST_URL)

test.describe('Owner onboarding email render', () => {
  test('renders subject + html + text + attachments', async () => {
    const rendered = await renderOwnerOnboardingKitEmail({
      toEmail: 'owner@example.com',
      ownerName: 'Test Owner',
      campgroundName: 'Test Campground',
      dashboardMagicLink: DASHBOARD_URL,
      qrCheckInUrl: GUEST_URL,
    })

    expect(rendered.subject).toMatch(/Campground Kit/i)
    expect(rendered.html.length).toBeGreaterThan(2000)
    expect(rendered.text.length).toBeGreaterThan(400)
    expect(rendered.attachments).toHaveLength(1)
    expect(rendered.attachments[0].filename).toBe('roadwave-qr.png')
  })

  test('Owner Dashboard CTA links to dashboard URL (not guest URL)', async () => {
    const rendered = await renderOwnerOnboardingKitEmail({
      toEmail: 'owner@example.com',
      ownerName: 'Test Owner',
      campgroundName: 'Test Campground',
      dashboardMagicLink: DASHBOARD_URL,
      qrCheckInUrl: GUEST_URL,
    })

    expect(rendered.html).toContain(`href="${DASHBOARD_URL_ESC}"`)
    expect(rendered.html).toMatch(/Open Your Dashboard/i)
  })

  test('Guest section links to guest URL (not dashboard URL)', async () => {
    const rendered = await renderOwnerOnboardingKitEmail({
      toEmail: 'owner@example.com',
      ownerName: 'Test Owner',
      campgroundName: 'Test Campground',
      dashboardMagicLink: DASHBOARD_URL,
      qrCheckInUrl: GUEST_URL,
    })

    expect(rendered.html).toContain(`href="${GUEST_URL_ESC}"`)
    expect(rendered.html).toMatch(/Guest check-in page/i)
    expect(rendered.html).toMatch(/not your dashboard/i)
  })

  test('Owner and Guest hrefs are distinct in HTML', async () => {
    const rendered = await renderOwnerOnboardingKitEmail({
      toEmail: 'owner@example.com',
      ownerName: 'Test Owner',
      campgroundName: 'Test Campground',
      dashboardMagicLink: DASHBOARD_URL,
      qrCheckInUrl: GUEST_URL,
    })

    // The QR-section bounded substring must contain GUEST and NOT DASHBOARD
    const idx = rendered.html.indexOf('Guest check-in URL:')
    expect(idx).toBeGreaterThan(-1)
    const after = rendered.html.slice(idx, idx + 600)
    expect(after).toContain(GUEST_URL_ESC)
    expect(after).not.toContain(DASHBOARD_URL_ESC)
  })

  test('Plaintext labels OWNER DASHBOARD and GUEST CHECK-IN PAGE separately', async () => {
    const rendered = await renderOwnerOnboardingKitEmail({
      toEmail: 'owner@example.com',
      ownerName: 'Test Owner',
      campgroundName: 'Test Campground',
      dashboardMagicLink: DASHBOARD_URL,
      qrCheckInUrl: GUEST_URL,
    })

    expect(rendered.text).toContain('OWNER DASHBOARD')
    expect(rendered.text).toContain('GUEST CHECK-IN PAGE')

    const ownerLineMatch = rendered.text.match(/OWNER DASHBOARD[^\n]*\n([^\n]+)/i)
    expect(ownerLineMatch, 'plaintext owner URL line').toBeTruthy()
    expect(ownerLineMatch?.[1]).toContain(DASHBOARD_URL)
    expect(ownerLineMatch?.[1]).not.toContain(GUEST_URL)

    const guestLineMatch = rendered.text.match(/GUEST CHECK-IN PAGE[^\n]*\n([^\n]+)/i)
    expect(guestLineMatch, 'plaintext guest URL line').toBeTruthy()
    expect(guestLineMatch?.[1]).toContain(GUEST_URL)
    expect(guestLineMatch?.[1]).not.toContain(DASHBOARD_URL)
  })
})

// @ts-check
// Coverage for the pre-launch infra batch: Resend test endpoint,
// campground landing pages, homepage two-path split, /account/delete
// route + DELETE-confirmation gating, footer link audit, no-stale-/safety
// references for account deletion.
//
// Most assertions are structural — file-content checks via fs.readFile —
// because a real end-to-end run would need Stripe + Supabase + a real
// Resend send to be meaningful. The structural sweep catches regressions
// in any layer before the deploy.

import { test, expect } from '@playwright/test'

test.describe('Resend test endpoint', () => {
  test('exists at /api/email/test and is admin-gated', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/api/email/test/route.ts', 'utf8')
    // Both verbs land on requireAdmin() before sending.
    expect(src).toContain('requireAdmin')
    expect(src).toMatch(/export async function GET/)
    expect(src).toMatch(/export async function POST/)
    // The handler ultimately calls the centralized Resend service.
    expect(src).toContain('sendBrandedEmail')
  })

  test('central Resend service uses the SDK and is the only sender', async () => {
    const fs = await import('node:fs/promises')
    const central = await fs.readFile('src/lib/email/resend.ts', 'utf8')
    expect(central).toContain("from 'resend'")
    expect(central).toContain('export async function sendBrandedEmail')

    // No email file should still be using the raw Resend REST endpoint —
    // they all go through sendBrandedEmail() now.
    const emailFiles = await fs.readdir('src/lib/email')
    for (const file of emailFiles) {
      if (!file.endsWith('.ts')) continue
      if (file === 'resend.ts') continue
      const body = await fs.readFile(`src/lib/email/${file}`, 'utf8')
      expect(body, `${file} should not call api.resend.com directly`).not.toMatch(
        /fetch\(['"]https:\/\/api\.resend\.com/,
      )
    }
  })
})

test.describe('Campground landing pages', () => {
  test('the dynamic route + 404 boundary both exist', async () => {
    const fs = await import('node:fs/promises')
    const page = await fs.readFile(
      'src/app/campground/[slug]/page.tsx',
      'utf8',
    )
    expect(page).toContain('notFound()')
    expect(page).toContain('campground_qr_tokens')
    expect(page).toContain('Welcome to ')
    expect(page).toContain('No exact site numbers')
    expect(page).toContain('No public group chat')

    const notFound = await fs.readFile(
      'src/app/campground/[slug]/not-found.tsx',
      'utf8',
    )
    expect(notFound).toContain("hasn") // "hasn't activated RoadWave yet"
  })
})

test.describe('Homepage two-path audience split', () => {
  test('homepage source has the two-card section + correct CTAs', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile('src/app/page.tsx', 'utf8')
    expect(src).toContain('For campers')
    expect(src).toContain('For campground owners')
    expect(src).toContain('Try the Demo')
    expect(src).toContain('Start My Campground Pilot')
    // Camper card must come before owner card so the mobile stack
    // matches the spec ("camper card on top").
    const camperIdx = src.indexOf('For campers')
    const ownerIdx = src.indexOf('For campground owners')
    expect(camperIdx).toBeGreaterThan(0)
    expect(ownerIdx).toBeGreaterThan(camperIdx)
  })
})

test.describe('Account deletion route', () => {
  test('the new /account/delete page lives under (app) and gates by login', async () => {
    const fs = await import('node:fs/promises')
    const page = await fs.readFile(
      'src/app/(app)/account/delete/page.tsx',
      'utf8',
    )
    expect(page).toContain('DeleteAccountForm')
    expect(page).toContain('cannot be undone')
  })

  test('legacy /settings/delete-account redirects to /account/delete', async () => {
    const fs = await import('node:fs/promises')
    const legacy = await fs.readFile(
      'src/app/(app)/settings/delete-account/page.tsx',
      'utf8',
    )
    expect(legacy).toContain("redirect('/account/delete')")
  })

  test('DELETE confirmation gates the submit button in the form', async () => {
    const fs = await import('node:fs/promises')
    const form = await fs.readFile(
      'src/components/settings/delete-account-form.tsx',
      'utf8',
    )
    // The form must require the literal string DELETE before enabling.
    expect(form).toContain("'DELETE'")
  })
})

test.describe('Footer audit', () => {
  test('footer points Account Deletion at /account/delete and not /safety', async () => {
    const fs = await import('node:fs/promises')
    const footer = await fs.readFile(
      'src/components/ui/site-footer.tsx',
      'utf8',
    )
    expect(footer).toContain("'/account/delete'")
    // No GUEST_LINKS row should pair "Account Deletion" with /safety any more.
    expect(footer).not.toMatch(
      /label:\s*'Account Deletion',\s*href:\s*'\/safety'/,
    )
    // Sample campground page link present.
    expect(footer).toMatch(/See a sample campground page/i)
    // Both contact addresses still surface.
    expect(footer).toContain('hello@getroadwave.com')
    expect(footer).toContain('safety@getroadwave.com')
  })

  test('no other route still points "Account Deletion" at /safety', async () => {
    const fs = await import('node:fs/promises')
    const footer = await fs.readFile(
      'src/components/ui/site-footer.tsx',
      'utf8',
    )
    // Specific to Account Deletion — Safety itself is still allowed to
    // route to /safety as its own link.
    const acctDeletionLine = footer
      .split('\n')
      .find((l) => l.includes('Account Deletion'))
    expect(acctDeletionLine).toBeDefined()
    expect(acctDeletionLine).toContain('/account/delete')
  })
})

test.describe('Vercel cron + new email files', () => {
  test('vercel.json schedules the trial-expiring cron', async () => {
    const fs = await import('node:fs/promises')
    const json = JSON.parse(await fs.readFile('vercel.json', 'utf8'))
    /** @type {{ path: string, schedule: string }[]} */
    const crons = json.crons ?? []
    const trial = crons.find((c) => c.path === '/api/cron/trial-expiring')
    expect(trial, 'trial-expiring cron should be configured').toBeDefined()
  })

  test('trial-expiring + payment-failed + report-confirmation email files exist', async () => {
    const fs = await import('node:fs/promises')
    await fs.access('src/lib/email/trial-expiring.ts')
    await fs.access('src/lib/email/payment-failed.ts')
    await fs.access('src/lib/email/report-confirmation.ts')
    await fs.access('src/lib/email/password-reset.ts')
    await fs.access('src/lib/email/magic-link.ts')
  })

  test('Stripe webhook fires the payment-failed email', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/app/api/stripe/webhook/route.ts',
      'utf8',
    )
    expect(src).toContain('sendPaymentFailedEmail')
  })
})

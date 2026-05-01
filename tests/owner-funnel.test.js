// @ts-check
// Self-serve owner funnel — /start landing, /owner/signup form,
// Stripe webhook + provisioning wiring, owner trial banner + billing
// page, admin subscription column + extend trial.
//
// Behavioral end-to-end coverage requires a Stripe test account +
// authenticated browser sessions; structural assertions below verify
// the wiring across files so a regression in any layer fails CI.

import { test, expect } from '@playwright/test'

test.describe('Owner funnel — public', () => {
  test('/start renders the spec hero + both CTAs', async ({ page }) => {
    await page.goto('/start')
    await expect(
      page.getByRole('heading', {
        name: /Activate RoadWave at Your Campground/i,
      }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('link', { name: /Start My Campground Pilot/i })
        .first(),
    ).toBeVisible()
    await expect(
      page
        .getByRole('link', { name: /Watch 90-Second Demo/i })
        .first(),
    ).toBeVisible()
    // §3 pricing block.
    await expect(page.getByText(/\$39\/month/i).first()).toBeVisible()
    await expect(page.getByText(/Cancel anytime/i).first()).toBeVisible()
  })

  test('/owner/signup form has all four required ack checkboxes', async ({
    page,
  }) => {
    await page.goto('/owner/signup')
    for (const name of [
      'accepted_partner_terms',
      'ack_optional',
      'ack_no_site_numbers',
      'ack_not_emergency',
    ]) {
      const cb = page.locator(`input[name="${name}"]`)
      await expect(cb).toHaveCount(1)
      await expect(cb).toHaveAttribute('required', '')
      await expect(cb).toHaveAttribute('type', 'checkbox')
    }
  })

  test('/owner/signup submit button starts disabled until acks are checked', async ({
    page,
  }) => {
    await page.goto('/owner/signup')
    const submit = page.getByRole('button', {
      name: /Start My Campground Pilot/i,
    })
    await expect(submit).toBeDisabled()
    for (const name of [
      'accepted_partner_terms',
      'ack_optional',
      'ack_no_site_numbers',
      'ack_not_emergency',
    ]) {
      await page.locator(`input[name="${name}"]`).check()
    }
    await expect(submit).toBeEnabled()
  })
})

test.describe('Owner funnel — structural wiring', () => {
  test('migration 0031 declares the spec billing schema', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'supabase/migrations/0031_owner_funnel_billing.sql',
      'utf8',
    )
    for (const col of [
      'stripe_customer_id text',
      'stripe_subscription_id text',
      'plan text',
      'subscription_status text',
      'trial_started_at timestamptz',
      'trial_ends_at timestamptz',
      'current_period_end timestamptz',
      'onb_qr_printed boolean',
      'onb_qr_posted boolean',
      'onb_first_bulletin_sent boolean',
    ]) {
      expect(src, `migration must add column ${col}`).toContain(col)
    }
    // owner_signup_submissions table.
    expect(src).toContain(
      'create table if not exists public.owner_signup_submissions',
    )
    // Admin extend-trial RPC + is_admin() guard.
    expect(src).toContain('public.extend_campground_trial(')
    expect(src).toContain('public.is_admin()')
    // Submissions table is admin-only SELECT, no client INSERT/UPDATE
    // policies.
    expect(src).toContain('owner_signup_submissions_admin_select')
    expect(src).not.toContain('owner_signup_submissions_select_own')
    expect(src).not.toContain('owner_signup_submissions_insert_')
  })

  test('Stripe routes + lib have the spec wiring', async () => {
    const fs = await import('node:fs/promises')
    const checkout = await fs.readFile(
      'src/app/api/stripe/checkout/route.ts',
      'utf8',
    )
    expect(checkout).toContain('isStripeConfigured')
    expect(checkout).toContain('client_reference_id')
    expect(checkout).toContain('trial_period_days: 14')

    const portal = await fs.readFile(
      'src/app/api/stripe/portal/route.ts',
      'utf8',
    )
    expect(portal).toContain('billingPortal.sessions.create')
    expect(portal).toContain("redirect(new URL('/owner/login'")

    const webhook = await fs.readFile(
      'src/app/api/stripe/webhook/route.ts',
      'utf8',
    )
    expect(webhook).toContain('STRIPE_WEBHOOK_SECRET')
    expect(webhook).toContain('webhooks.constructEvent')
    expect(webhook).toContain("'checkout.session.completed'")
    expect(webhook).toContain("'customer.subscription.deleted'")
    expect(webhook).toContain('sendOwnerOnboardingKitEmail')
    expect(webhook).toContain("type: 'magiclink'")

    const lib = await fs.readFile('src/lib/stripe/server.ts', 'utf8')
    expect(lib).toContain('export function isStripeConfigured')
    expect(lib).toContain('STRIPE_SECRET_KEY')
  })

  test('owner signup action persists to owner_signup_submissions then redirects to Stripe', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/app/owner/signup/actions.ts',
      'utf8',
    )
    expect(src).toContain("'use server'")
    expect(src).toContain("from('owner_signup_submissions')")
    expect(src).toContain('/api/stripe/checkout')
    expect(src).toContain('isStripeConfigured()')
    // All four acks required.
    for (const name of [
      'accepted_partner_terms',
      'ack_optional',
      'ack_no_site_numbers',
      'ack_not_emergency',
    ]) {
      expect(src).toContain(name)
    }
  })

  test('onboarding kit email contains the spec copy + magic link', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/lib/email/owner-onboarding-kit.ts',
      'utf8',
    )
    expect(src).toContain('Your RoadWave Campground Kit Is Ready')
    expect(src).toContain('Front-desk script')
    expect(src).toContain('911 or campground staff')
    expect(src).toContain('dashboardMagicLink')
    expect(src).toContain('— Mark, RoadWave')
  })

  test('owner dashboard shows trial banner + spec checklist + billing tile', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/app/owner/(authed)/dashboard/page.tsx',
      'utf8',
    )
    expect(src).toContain('TrialBanner')
    expect(src).toContain('Download and print your QR code')
    expect(src).toContain('Post it at your welcome sign')
    expect(src).toContain('Send your first guest bulletin')
    expect(src).toContain('href="/owner/billing"')
  })

  test('owner billing page exposes Manage Subscription with a graceful fallback', async () => {
    const fs = await import('node:fs/promises')
    const src = await fs.readFile(
      'src/app/owner/(authed)/billing/page.tsx',
      'utf8',
    )
    expect(src).toContain('href="/api/stripe/portal"')
    expect(src).toContain('Manage Subscription')
    expect(src).toContain('isStripeConfigured()')
    expect(src).toContain('TrialBanner')
  })

  test('Campground Updates Only privacy mode is wired across the stack', async () => {
    const fs = await import('node:fs/promises')

    // 1. Migrations: 0032/0033 introduced the original enum value
    //    `campground_only`, then 0034 renamed it to
    //    `campground_updates_only` and 0035 recreated the RPCs that
    //    depend on it. Same two-file split rule as before — the new
    //    enum value can't be referenced in the same transaction it
    //    was declared in.
    const sql34 = await fs.readFile(
      'supabase/migrations/0034_rename_campground_updates_only.sql',
      'utf8',
    )
    expect(sql34).toContain(
      "rename value 'campground_only' to 'campground_updates_only'",
    )
    const sql35 = await fs.readFile(
      'supabase/migrations/0035_recreate_visibility_rpcs.sql',
      'utf8',
    )
    expect(sql35).toContain('public.owner_visibility_breakdown(')
    expect(sql35).toContain('campground_updates_only_count int')
    expect(sql35).toContain('active_campground_updates_only int')
    expect(sql35).toContain("'campground_updates_only'")

    // 2. PrivacyMode type carries the renamed value + the two toggles.
    const types = await fs.readFile('src/lib/types/db.ts', 'utf8')
    expect(types).toContain("'campground_updates_only'")
    expect(types).toContain('share_bulletins')
    expect(types).toContain('share_meetups')

    // 3. Validators accept the new mode + toggles.
    const validator = await fs.readFile(
      'src/lib/validators/profile.ts',
      'utf8',
    )
    expect(validator).toContain("'campground_updates_only'")
    expect(validator).toContain('share_bulletins')
    expect(validator).toContain('share_meetups')

    // 4. Privacy form renders the 4th option + sub-toggles + the
    //    Campground Updates Only confirmation banner.
    const form = await fs.readFile(
      'src/components/privacy/privacy-mode-form.tsx',
      'utf8',
    )
    expect(form).toContain("'campground_updates_only'")
    expect(form).toContain('Campground Updates Only')
    expect(form).toContain('Campground Bulletins')
    expect(form).toContain('Meetups & Activities')
    expect(form).toContain('You are now in Campground Updates Only mode')

    // 5. /home + /meetups self-mute on the new toggles.
    const home = await fs.readFile('src/app/(app)/home/page.tsx', 'utf8')
    expect(home).toContain('share_bulletins')
    const meetups = await fs.readFile(
      'src/app/(app)/meetups/page.tsx',
      'utf8',
    )
    expect(meetups).toContain('share_meetups')

    // 6. /nearby blocks the camper list when the viewer is in CUO.
    const nearby = await fs.readFile(
      'src/app/(app)/nearby/page.tsx',
      'utf8',
    )
    expect(nearby).toContain("'campground_updates_only'")
    expect(nearby).toContain('inUpdatesOnlyMode')
    expect(nearby).toContain('Campers Checked In Here')

    // 7. Owner dashboard wires the visibility breakdown.
    const dash = await fs.readFile(
      'src/app/owner/(authed)/dashboard/page.tsx',
      'utf8',
    )
    expect(dash).toContain('VisibilityBreakdown')
    expect(dash).toContain('owner_visibility_breakdown')

    // 8. Admin activity page surfaces the renamed count.
    const adminAct = await fs.readFile(
      'src/app/admin/activity/page.tsx',
      'utf8',
    )
    expect(adminAct).toContain('active_campground_updates_only')
    expect(adminAct).toContain('Campground Updates Only')

    // 9. Demo PrivacyScreen and Riley tour Step 6 mention the new
    //    mode + sub-toggles + the CUO banner copy.
    const demo = await fs.readFile('src/pages/demo.jsx', 'utf8')
    expect(demo).toContain("'campground_updates_only'")
    expect(demo).toContain('Campground Bulletins')
    expect(demo).toContain('You are now in Campground Updates Only mode')
    const tour = await fs.readFile('src/app/tour/page.jsx', 'utf8')
    expect(tour).toContain('Campground Updates Only')
  })

  test('Riley popup CTA is context-aware (camper vs owner pages)', async () => {
    const fs = await import('node:fs/promises')
    const helper = await fs.readFile(
      'src/lib/ui/riley-popup-cta.ts',
      'utf8',
    )
    expect(helper).toContain("'/owners'")
    expect(helper).toContain("'/campgrounds'")
    expect(helper).toContain("'/start'")
    expect(helper).toContain('Start My Campground Pilot')
    expect(helper).toContain('Try the Demo')

    // Both Riley popups consume the helper.
    const floating = await fs.readFile(
      'src/components/ui/floating-tour-button.tsx',
      'utf8',
    )
    expect(floating).toContain('rileyPopupCtaForPath')
    // Old "Got it!" button is replaced.
    expect(floating).not.toContain('>Got it!<')

    const cgRiley = await fs.readFile(
      'src/components/campgrounds/riley-campground-button.tsx',
      'utf8',
    )
    expect(cgRiley).toContain('rileyPopupCtaForPath')
    // Old "Request a Demo" button is replaced.
    expect(cgRiley).not.toContain('Request a Demo')
  })

  test('admin inbox surfaces owner_signup_submissions rows', async () => {
    const fs = await import('node:fs/promises')
    const page = await fs.readFile('src/app/admin/inbox/page.tsx', 'utf8')
    expect(page).toContain("from('owner_signup_submissions')")
    expect(page).toContain('Self-serve owner signups')
    expect(page).toContain('OwnerSubmissionRow')

    const row = await fs.readFile(
      'src/components/admin/inbox-row.tsx',
      'utf8',
    )
    expect(row).toContain('OwnerSubmissionRow')
    expect(row).toContain('updateOwnerSubmissionStatusAction')
    // Status options match the migration's check constraint.
    for (const s of ['new', 'paid', 'abandoned', 'provisioned']) {
      expect(row).toContain(`'${s}'`)
    }

    const actions = await fs.readFile(
      'src/app/admin/inbox/actions.ts',
      'utf8',
    )
    expect(actions).toContain('updateOwnerSubmissionStatusAction')
    expect(actions).toContain("from('owner_signup_submissions')")
    expect(actions).toContain('createSupabaseAdminClient')
    expect(actions).toContain('owner_submission.status_updated')
  })

  test('admin campgrounds page surfaces subscription status + extend buttons', async () => {
    const fs = await import('node:fs/promises')
    const page = await fs.readFile(
      'src/app/admin/campgrounds/page.tsx',
      'utf8',
    )
    expect(page).toContain('subscription_status')
    expect(page).toContain('trial_ends_at')
    expect(page).toContain('expiring_soon')

    const row = await fs.readFile(
      'src/components/admin/campground-row.tsx',
      'utf8',
    )
    expect(row).toContain('+7d')
    expect(row).toContain('+30d')
    expect(row).toContain('extendCampgroundTrialAction')

    const actions = await fs.readFile(
      'src/app/admin/campgrounds/actions.ts',
      'utf8',
    )
    expect(actions).toContain('extendCampgroundTrialAction')
    expect(actions).toContain('extend_campground_trial')
    expect(actions).toContain("requireAdmin")
  })
})

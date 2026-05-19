// @ts-check
//
// Tests that one campground owner cannot read, modify, or otherwise
// access another owner's campground data — the multi-tenant boundary
// is enforced by RLS + explicit ownership checks in server actions.
//
// All tests in this file are STUBS today because they require two
// distinct authenticated owner sessions in a preview environment with
// the Supabase service-role key available to mint magic links. The
// scaffolding is in place so you can fill them in when you provision
// a preview env and two seeded test owners.
//
// Gated on QA_ENV=preview AND SUPABASE_SERVICE_ROLE_KEY available.

import { test } from '@playwright/test'

const QA_ENV = process.env.QA_ENV ?? 'unknown'
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL

test.describe('Cross-owner isolation', () => {
  test.skip(QA_ENV !== 'preview', 'QA_ENV must be "preview"')
  test.skip(!SRK || !URL, 'Supabase service-role + URL required in env')

  test.skip('Owner A cannot read Owner B campground via RLS', async () => {
    // Implementation recipe:
    //   1. Seed two test owners (or reuse stable preview owners).
    //   2. Sign in as Owner A via verifyOtp.
    //   3. Try to SELECT Owner B's campground row via the user's
    //      authed Supabase client.
    //   4. Expect zero rows (RLS denies).
    //   5. Sign out. Sign in as Owner B. Verify B CAN see their own row.
  })

  test.skip('Owner A cannot upload to Owner B logo path via server action', async () => {
    // Recipe:
    //   1. Sign in as Owner A.
    //   2. POST to /api/<action-endpoint> calling uploadCampgroundLogoAction
    //      with Owner B's campground_id and a tiny PNG.
    //   3. Expect server action to return { ok: false, error: /don't manage/i }.
    //   4. Verify Owner B's campgrounds.logo_url is unchanged.
  })

  test.skip('Owner A cannot bulletin-post on Owner B campground', async () => {
    // Recipe:
    //   1. Sign in as Owner A.
    //   2. Attempt to POST to the bulletin server action with B's
    //      campground_id in formData.
    //   3. Expect either action returns an error, or RLS rejects the
    //      bulletins insert.
  })

  test.skip('Camper cannot access /owner/* routes', async () => {
    // Recipe:
    //   1. Quickcheckin (or signup + email confirm) as a camper.
    //   2. Visit /owner/dashboard.
    //   3. Expect redirect to /checkin (current behavior — camper
    //      role gets bounced) or /login. NOT a 200 with owner content.
  })

  test.skip('Camper cannot access /admin/* routes', async () => {
    // Recipe:
    //   1. Sign in as camper.
    //   2. Visit /admin/activity.
    //   3. Expect redirect or 404. Not a 200 with admin content.
  })

  test.skip('Owner cannot access /admin/* unless super_admin role set', async () => {
    // Recipe:
    //   1. Sign in as a regular Owner (not promoted to super_admin).
    //   2. Visit /admin/activity.
    //   3. Expect redirect or 404.
  })
})

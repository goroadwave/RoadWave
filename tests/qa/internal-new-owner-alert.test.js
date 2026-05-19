// @ts-check
//
// Render-only assertion for the internal new-owner alert email.
// Mirrors the pattern from tests/qa/onboarding-email.test.js: import
// the render helper directly, call it with fixed args, assert on the
// returned subject + html + text + recipient list. No Resend mock
// needed; nothing leaves the test process.
//
// What this verifies:
//   * Subject contains "New campground trial" + the campground name.
//   * HTML and text bodies contain campground name, owner email,
//     signup time, Stripe customer + subscription IDs, plan, trial
//     end date, and both clickable links (public welcome page and
//     admin campgrounds).
//   * NO secrets leak: rendered body never contains sk_live_,
//     sk_test_, whsec_, service_role, SUPABASE_SERVICE, RESEND_API_KEY,
//     or a JWT header prefix.
//   * Recipients default to hello@getroadwave.com when
//     INTERNAL_NEW_OWNER_NOTIFY_EMAIL is unset.
//   * Recipients honour a comma-separated env override and trim
//     whitespace.

import { expect, test } from '@playwright/test'
import { renderInternalNewOwnerAlert } from '../../src/lib/email/internal-new-owner-alert.ts'

const FIXED_SIGNUP_AT = new Date('2026-06-01T15:00:00.000Z')
const FIXED_TRIAL_END = new Date('2026-07-01T15:00:00.000Z')

const SAMPLE_ARGS = {
  campgroundName: 'Pinecrest RV Park',
  campgroundSlug: 'pinecrest-rv-park',
  ownerEmail: 'sample-owner@example.com',
  ownerName: 'Jamie Sample',
  signupAt: FIXED_SIGNUP_AT,
  stripeCustomerId: 'cus_TestSampleCustomer123',
  stripeSubscriptionId: 'sub_TestSampleSubscription456',
  subscriptionStatus: /** @type {'trial'} */ ('trial'),
  plan: /** @type {'monthly'} */ ('monthly'),
  trialEndsAt: FIXED_TRIAL_END,
  campgroundUrl: 'https://www.getroadwave.com/campground/pinecrest-rv-park',
  adminCampgroundsUrl: 'https://www.getroadwave.com/admin/campgrounds',
}

test.describe('Internal new-owner alert render', () => {
  test.beforeEach(() => {
    // Each test starts with a clean env so the default-recipient
    // assertion isn't contaminated by an earlier test setting the var.
    delete process.env.INTERNAL_NEW_OWNER_NOTIFY_EMAIL
  })

  test('subject + html + text contain every key field', () => {
    const rendered = renderInternalNewOwnerAlert(SAMPLE_ARGS)

    expect(rendered.subject).toContain('New campground trial')
    expect(rendered.subject).toContain('Pinecrest RV Park')

    // HTML body
    expect(rendered.html).toContain('Pinecrest RV Park')
    expect(rendered.html).toContain('pinecrest-rv-park')
    expect(rendered.html).toContain('sample-owner@example.com')
    expect(rendered.html).toContain('Jamie Sample')
    expect(rendered.html).toContain('cus_TestSampleCustomer123')
    expect(rendered.html).toContain('sub_TestSampleSubscription456')
    expect(rendered.html).toContain('Monthly')
    expect(rendered.html).toContain('$39')
    expect(rendered.html).toContain('trial')

    // Both clickable links
    expect(rendered.html).toContain(
      'https://www.getroadwave.com/campground/pinecrest-rv-park',
    )
    expect(rendered.html).toContain(
      'https://www.getroadwave.com/admin/campgrounds',
    )

    // Plaintext mirrors HTML
    expect(rendered.text).toContain('Pinecrest RV Park')
    expect(rendered.text).toContain('sample-owner@example.com')
    expect(rendered.text).toContain('cus_TestSampleCustomer123')
    expect(rendered.text).toContain('sub_TestSampleSubscription456')
  })

  test('no secrets leak into the rendered body', () => {
    const rendered = renderInternalNewOwnerAlert(SAMPLE_ARGS)
    const corpus = rendered.html + '\n' + rendered.text + '\n' + rendered.subject

    expect(corpus, 'no Stripe live secret key').not.toMatch(/sk_live_/i)
    expect(corpus, 'no Stripe test secret key').not.toMatch(/sk_test_/i)
    expect(corpus, 'no webhook signing secret').not.toMatch(/whsec_/i)
    expect(corpus, 'no service_role mention').not.toMatch(/service_role/i)
    expect(corpus, 'no SUPABASE_SERVICE env name').not.toMatch(/SUPABASE_SERVICE/i)
    expect(corpus, 'no RESEND_API_KEY mention').not.toMatch(/RESEND_API_KEY/i)
    expect(corpus, 'no JWT header prefix').not.toMatch(/eyJhbGciOi/i)
  })

  test('recipient defaults to hello@getroadwave.com when env unset', () => {
    const rendered = renderInternalNewOwnerAlert(SAMPLE_ARGS)
    expect(rendered.to).toEqual(['hello@getroadwave.com'])
  })

  test('recipients honour comma-separated env override (trimmed)', () => {
    process.env.INTERNAL_NEW_OWNER_NOTIFY_EMAIL =
      'hello@getroadwave.com, alerts+roadwave@example.com'
    const rendered = renderInternalNewOwnerAlert(SAMPLE_ARGS)
    expect(rendered.to).toEqual([
      'hello@getroadwave.com',
      'alerts+roadwave@example.com',
    ])
  })

  test('owner name missing gracefully renders as em-dash', () => {
    const rendered = renderInternalNewOwnerAlert({
      ...SAMPLE_ARGS,
      ownerName: null,
    })
    expect(rendered.html).toContain('Owner name')
    expect(rendered.html).toMatch(/Owner name<\/td>\s*<td[^>]*>—/)
    expect(rendered.text).toContain('Owner name:          —')
  })

  test('annual plan label shows $390/yr', () => {
    const rendered = renderInternalNewOwnerAlert({
      ...SAMPLE_ARGS,
      plan: 'annual',
    })
    expect(rendered.html).toContain('Annual')
    expect(rendered.html).toContain('$390')
    expect(rendered.text).toContain('Annual')
    expect(rendered.text).toContain('$390/yr')
  })
})

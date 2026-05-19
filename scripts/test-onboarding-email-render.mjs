// Renders the owner onboarding email IN PROCESS (no Resend call, no
// network) and asserts that the two link surfaces — the owner
// dashboard CTA and the guest check-in page — route to different,
// correct URLs.
//
// This is the regression test for the launch-blocking bug where the
// "Open Your Dashboard" button landed an owner on /checkin instead of
// /owner/dashboard. The root cause was upstream (profiles.role not
// being promoted to 'owner' by the Stripe webhook), but the test here
// confirms the email itself never collapses the two URLs into one and
// always labels them unambiguously.
//
// Run with:
//   node --experimental-strip-types scripts/test-onboarding-email-render.mjs
// or via tsx if available.

import { renderOwnerOnboardingKitEmail } from '../src/lib/email/owner-onboarding-kit.ts'
import { escapeHtml } from '../src/lib/email/resend.ts'

const DASHBOARD_URL =
  'https://www.getroadwave.com/auth/sign-in?th=ZZZ_TEST_TOKEN_HASH_ZZZ&email=owner%40example.com&next=%2Fowner%2Fdashboard'
const GUEST_URL =
  'https://www.getroadwave.com/campground/test-camp?token=00000000-0000-0000-0000-000000000000'

// Inside <a href="..."> the template HTML-escapes both URLs (the `&`
// in query strings becomes `&amp;`). Assertions on the HTML output
// compare against these escaped forms.
const DASHBOARD_URL_ESC = escapeHtml(DASHBOARD_URL)
const GUEST_URL_ESC = escapeHtml(GUEST_URL)

const rendered = await renderOwnerOnboardingKitEmail({
  toEmail: 'owner@example.com',
  ownerName: 'Test Owner',
  campgroundName: 'Test Campground',
  dashboardMagicLink: DASHBOARD_URL,
  qrCheckInUrl: GUEST_URL,
})

const failures = []
function assert(cond, label) {
  if (!cond) failures.push(label)
}

// ── Subject ────────────────────────────────────────────────────────
assert(
  /Campground Kit/i.test(rendered.subject),
  'subject mentions "Campground Kit"',
)

// ── HTML body checks ───────────────────────────────────────────────
const html = rendered.html

// 1. The "Open Your Dashboard" CTA button MUST be wired to the owner
//    magic-link URL — not the guest QR URL.
assert(
  html.includes(`href="${DASHBOARD_URL_ESC}"`),
  'HTML contains an anchor pointing at the owner dashboard magic-link URL',
)
assert(
  /Open Your Dashboard/i.test(html),
  'HTML contains the "Open Your Dashboard" CTA label',
)

// 2. The guest check-in section MUST link to the guest QR URL — not
//    the dashboard URL.
assert(
  html.includes(`href="${GUEST_URL_ESC}"`),
  'HTML contains an anchor pointing at the guest check-in URL',
)
assert(
  /Guest check-in page/i.test(html),
  'HTML labels the guest section as "Guest check-in page"',
)

// 3. The two URLs must appear as DIFFERENT hrefs. A future bug where
//    the template accidentally collapsed them into the same value
//    would be caught here.
assert(DASHBOARD_URL !== GUEST_URL, 'test URLs are distinct (sanity)')
const hasBoth =
  html.includes(`href="${DASHBOARD_URL_ESC}"`) &&
  html.includes(`href="${GUEST_URL_ESC}"`)
assert(hasBoth, 'HTML contains BOTH distinct hrefs (owner + guest)')

// 4. Disambiguating language: somewhere in the body, we explicitly
//    distinguish owner vs camper so an owner skimming the email can't
//    mistake the QR link for their dashboard.
assert(
  /two different links/i.test(html),
  'HTML contains a "two different links" explainer',
)
assert(
  /not your dashboard/i.test(html),
  'HTML contains a "not your dashboard" guardrail near the QR section',
)

// 5. The dashboard URL must NOT be used in the QR/guest section. We
//    detect this by checking the QR section's bounded substring.
//    Approach: ensure the substring "Guest check-in URL:" is followed
//    closely by the GUEST_URL, not the DASHBOARD_URL.
const guestSectionIdx = html.indexOf('Guest check-in URL:')
assert(guestSectionIdx > -1, 'HTML contains "Guest check-in URL:" anchor')
if (guestSectionIdx > -1) {
  const after = html.slice(guestSectionIdx, guestSectionIdx + 600)
  assert(
    after.includes(GUEST_URL_ESC),
    'Guest check-in section contains the guest URL',
  )
  assert(
    !after.includes(DASHBOARD_URL_ESC),
    'Guest check-in section does NOT contain the dashboard URL',
  )
}

// ── Plaintext body checks ──────────────────────────────────────────
const text = rendered.text

// The plaintext version must also distinguish the two URLs by label,
// since spam filters score plaintext separately and some clients only
// render plaintext.
assert(
  text.includes('OWNER DASHBOARD'),
  'plaintext labels the owner URL as "OWNER DASHBOARD"',
)
assert(
  text.includes('GUEST CHECK-IN PAGE'),
  'plaintext labels the guest URL as "GUEST CHECK-IN PAGE"',
)
assert(text.includes(DASHBOARD_URL), 'plaintext contains the dashboard URL')
assert(text.includes(GUEST_URL), 'plaintext contains the guest URL')

// The owner URL must NOT appear in the guest-link slot. Find the line
// labeled "GUEST CHECK-IN PAGE" and verify the URL on the next line is
// the guest one.
const guestLineMatch = text.match(/GUEST CHECK-IN PAGE[^\n]*\n([^\n]+)/i)
assert(guestLineMatch, 'plaintext has a guest URL line right after the label')
if (guestLineMatch) {
  assert(
    guestLineMatch[1].includes(GUEST_URL),
    'plaintext guest URL line contains the guest URL',
  )
  assert(
    !guestLineMatch[1].includes(DASHBOARD_URL),
    'plaintext guest URL line does NOT contain the dashboard URL',
  )
}

// Same check for the owner URL line.
const ownerLineMatch = text.match(/OWNER DASHBOARD[^\n]*\n([^\n]+)/i)
assert(ownerLineMatch, 'plaintext has an owner URL line right after the label')
if (ownerLineMatch) {
  assert(
    ownerLineMatch[1].includes(DASHBOARD_URL),
    'plaintext owner URL line contains the dashboard URL',
  )
  assert(
    !ownerLineMatch[1].includes(GUEST_URL),
    'plaintext owner URL line does NOT contain the guest URL',
  )
}

// ── Attachment sanity ──────────────────────────────────────────────
assert(rendered.attachments.length === 1, 'one attachment (the QR PNG)')
assert(
  rendered.attachments[0]?.filename === 'roadwave-qr.png',
  'QR attachment is named roadwave-qr.png',
)
assert(
  rendered.attachments[0]?.contentId === 'roadwave-onboarding-qr',
  'QR attachment has contentId for inline cid: reference',
)
assert(
  (rendered.attachments[0]?.content?.length ?? 0) > 1000,
  'QR PNG base64 looks plausibly non-empty',
)

// ── Verdict ────────────────────────────────────────────────────────
if (failures.length === 0) {
  console.log('All assertions passed.')
  console.log('HTML size:    ', rendered.html.length, 'chars')
  console.log('Text size:    ', rendered.text.length, 'chars')
  console.log('QR base64:    ', rendered.attachments[0].content.length, 'chars')
  process.exit(0)
} else {
  console.error('FAILED assertions:')
  for (const f of failures) console.error('  -', f)
  process.exit(1)
}

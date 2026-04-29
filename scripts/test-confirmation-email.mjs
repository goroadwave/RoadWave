// Smoke test for the Resend → confirmation-email integration.
//
//   RESEND_API_KEY=...   RESEND_FROM_EMAIL=...   TEST_TO=you@example.com   \
//     node scripts/test-confirmation-email.mjs
//
// Mirrors what src/lib/email/signup-confirmation.ts does at runtime: same
// FROM resolution logic (env var with hello@ fallback), same subject, same
// HTML template shape. Sends one guest-flavored email to TEST_TO and prints
// Resend's response so we can confirm the full path works.

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'RoadWave <hello@getroadwave.com>'
const SUBJECT = 'Welcome to RoadWave 👋 — confirm your email'

const TEST_TO = process.env.TEST_TO
const RESEND_API_KEY = process.env.RESEND_API_KEY

console.log('[wiring] RESEND_FROM_EMAIL set:', Boolean(process.env.RESEND_FROM_EMAIL))
console.log('[wiring] resolved FROM:', FROM_EMAIL)
console.log('[wiring] RESEND_API_KEY set:', Boolean(RESEND_API_KEY))
console.log('[wiring] TEST_TO:', TEST_TO || '(not set)')
console.log('')

if (!RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY. Aborting before sending.')
  process.exit(1)
}
if (!TEST_TO) {
  console.error('Missing TEST_TO. Aborting before sending.')
  process.exit(1)
}

// Fake-but-realistic confirmation URL. Don't use a real Supabase action_link
// — this script tests the email integration only, not the auth flow.
const confirmUrl =
  'https://www.getroadwave.com/auth/callback?code=test-confirmation-email-smoke'

const body = `You're one step away from finding your people on the road. Click below to confirm your email and get started.`
const eyebrow = 'Welcome to RoadWave'
const headline = "You're one step away."

const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>${SUBJECT}</title></head>
  <body style="margin:0; padding:0; background:#0a0f1c; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0f1c; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background:#0a0f1c;">
          <tr><td align="center" style="padding:8px 0 28px;">
            <span style="font-family:Georgia,serif; font-weight:800; font-size:34px; letter-spacing:-0.02em; line-height:1; white-space:nowrap;">
              <span style="color:#f5ecd9;">Road</span><span style="color:#f59e0b;">Wave</span>
              <span style="font-size:32px;" aria-hidden="true">👋</span>
            </span>
          </td></tr>
          <tr><td style="background:#111a2e; border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:36px 32px;">
            <p style="margin:0 0 6px; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase;">${eyebrow}</p>
            <h1 style="margin:0 0 18px; color:#f5ecd9; font-size:28px; font-weight:800; line-height:1.15;">${headline}</h1>
            <p style="margin:0 0 24px; color:#cbd3e0; font-size:16px; line-height:1.55;">${body}</p>
            <p style="margin:0 0 24px;"><a href="${confirmUrl}" style="display:inline-block; padding:14px 26px; font-size:15px; font-weight:700; color:#0a0f1c; text-decoration:none; border-radius:12px; background:#f59e0b;">Confirm my email</a></p>
            <p style="margin:0 0 6px; color:#94a3b8; font-size:13px;">This is a smoke test from scripts/test-confirmation-email.mjs — there's no real Supabase signup behind this link.</p>
            <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:18px 0;" />
            <p style="margin:0; color:#94a3b8; font-size:12px;">Questions? Reply to this email or write us at <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a>.</p>
          </td></tr>
          <tr><td align="center" style="padding:22px 12px 8px; color:#94a3b8; font-size:12px;">RoadWave — Privacy-first campground connections.</td></tr>
          <tr><td align="center" style="padding:0 12px 8px; color:#64748b; font-size:11px;">Sent to ${TEST_TO} from ${FROM_EMAIL}.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

const text = `${body}\n\nConfirm your email:\n${confirmUrl}\n\n(Smoke test — no real signup behind this link.)`

console.log('[send] POST https://api.resend.com/emails …')
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: FROM_EMAIL,
    to: [TEST_TO],
    subject: SUBJECT,
    html,
    text,
  }),
})

const responseText = await res.text()
console.log('[send] status:', res.status)
console.log('[send] body:', responseText.slice(0, 600))

if (res.ok) {
  console.log('')
  console.log(`✓ Sent. Check ${TEST_TO} for "${SUBJECT}".`)
} else {
  console.log('')
  console.log('✗ Resend rejected the send. Common causes:')
  console.log('  - RESEND_API_KEY is invalid or expired.')
  console.log('  - Sending domain (getroadwave.com) is not verified in Resend.')
  console.log('  - FROM address differs from a verified sender.')
  process.exit(1)
}

// Two branded confirmation emails — one for guest signups, one for owner
// signups — sent through Resend instead of Supabase's built-in mailer. We
// drive the URL via supabase.auth.admin.generateLink({ type: 'signup' }) so
// Supabase creates the user but does NOT auto-send its global template.
//
// Why split: Supabase only supports one global "Confirm signup" template,
// but the two flows have different audiences and need different copy.

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'RoadWave <hello@getroadwave.com>'

const SUBJECT = 'Welcome to RoadWave 👋 — confirm your email'

export type SendResult = { ok: boolean; error: string | null }

type SendArgs = {
  toEmail: string
  confirmUrl: string
}

export function sendGuestSignupConfirmEmail(args: SendArgs): Promise<SendResult> {
  return sendConfirmEmail({
    ...args,
    eyebrow: 'Welcome to RoadWave',
    headline: "You're one step away.",
    body: "You're one step away from finding your people on the road. Click below to confirm your email and get started.",
  })
}

export function sendOwnerSignupConfirmEmail(args: SendArgs): Promise<SendResult> {
  return sendConfirmEmail({
    ...args,
    eyebrow: 'For campground owners',
    headline: "You're one step away.",
    body: "You're one step away from helping your guests meet each other. Click below to confirm your email and get started.",
  })
}

type InternalArgs = SendArgs & {
  eyebrow: string
  headline: string
  body: string
}

async function sendConfirmEmail(args: InternalArgs): Promise<SendResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[signup-confirm] RESEND_API_KEY not set — skipping email.')
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [args.toEmail],
        subject: SUBJECT,
        html: buildHtml(args),
        text: buildText(args),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[signup-confirm] Resend rejected:', res.status, detail)
      return { ok: false, error: `Resend ${res.status}: ${detail}` }
    }
    return { ok: true, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resend send failed'
    console.error('[signup-confirm] send error:', msg)
    return { ok: false, error: msg }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml({ confirmUrl, toEmail, eyebrow, headline, body }: InternalArgs): string {
  const safeUrl = escapeHtml(confirmUrl)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${escapeHtml(SUBJECT)}</title>
  </head>
  <body style="margin:0; padding:0; background:#0a0f1c; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">
      ${escapeHtml(body)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0f1c; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background:#0a0f1c;">
            <tr>
              <td align="center" style="padding:8px 0 28px;">
                <span style="font-family:Georgia,'Times New Roman',serif; font-weight:800; font-size:34px; letter-spacing:-0.02em; line-height:1; white-space:nowrap;">
                  <span style="color:#f5ecd9;">Road</span><span style="color:#f59e0b;">Wave</span>
                  <span style="font-size:32px;" aria-hidden="true">👋</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="background:#111a2e; border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:36px 32px;">
                <p style="margin:0 0 6px; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 18px; color:#f5ecd9; font-size:28px; font-weight:800; line-height:1.15; letter-spacing:-0.01em;">${escapeHtml(headline)}</h1>
                <p style="margin:0 0 24px; color:#cbd3e0; font-size:16px; line-height:1.55;">${escapeHtml(body)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 28px;">
                  <tr>
                    <td align="center" bgcolor="#f59e0b" style="border-radius:12px;">
                      <a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block; padding:14px 26px; font-size:15px; font-weight:700; color:#0a0f1c; text-decoration:none; border-radius:12px; background:#f59e0b;">Confirm my email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 6px; color:#94a3b8; font-size:13px; line-height:1.5;">Or paste this link into your browser:</p>
                <p style="margin:0 0 22px; word-break:break-all; color:#f59e0b; font-size:13px; line-height:1.5;">
                  <a href="${safeUrl}" style="color:#f59e0b; text-decoration:underline;">${safeUrl}</a>
                </p>
                <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:18px 0;" />
                <p style="margin:0 0 8px; color:#94a3b8; font-size:12px; line-height:1.55;">
                  If you didn&rsquo;t sign up for RoadWave, you can safely ignore this email — no account will be created.
                </p>
                <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.55;">
                  Questions? Reply to this email or write us at
                  <a href="mailto:hello@getroadwave.com" style="color:#f59e0b; text-decoration:underline;">hello@getroadwave.com</a>.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 12px 8px; color:#94a3b8; font-size:12px; line-height:1.5;">
                RoadWave — Privacy-first campground connections.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 12px 8px; color:#64748b; font-size:11px; line-height:1.5;">
                Sent to ${escapeHtml(toEmail)} from hello@getroadwave.com.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildText({ confirmUrl, body }: InternalArgs): string {
  return `${body}

Confirm your email:
${confirmUrl}

If you didn't sign up for RoadWave, you can ignore this email — no account will be created.`
}

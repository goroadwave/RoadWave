// "Your demo is ready" email — sent from hello@getroadwave.com via Resend
// when a campground owner asks to email themselves their preview link.

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'RoadWave <hello@getroadwave.com>'

export type SendResult = { ok: boolean; error: string | null }

type Args = {
  toEmail: string
  campgroundName: string
  previewUrl: string
}

export async function sendDemoLinkEmail(args: Args): Promise<SendResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[demo-link] RESEND_API_KEY not set — skipping email.')
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
        subject: `Your RoadWave preview for ${args.campgroundName}`,
        html: buildHtml(args),
        text: buildText(args),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[demo-link] Resend rejected:', res.status, detail)
      return { ok: false, error: `Resend ${res.status}: ${detail}` }
    }
    return { ok: true, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resend send failed'
    console.error('[demo-link] send error:', msg)
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

function buildHtml({ toEmail, campgroundName, previewUrl }: Args): string {
  const safeUrl = escapeHtml(previewUrl)
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Your RoadWave preview</title></head>
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
            <p style="margin:0 0 6px; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase;">Your preview is ready</p>
            <h1 style="margin:0 0 18px; color:#f5ecd9; font-size:28px; font-weight:800; line-height:1.15;">${escapeHtml(campgroundName)}</h1>
            <p style="margin:0 0 24px; color:#cbd3e0; font-size:16px; line-height:1.55;">
              Here&rsquo;s your branded RoadWave preview. The link works for the next 30 days — share it with your team or partners however you like.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 28px;">
              <tr><td align="center" bgcolor="#f59e0b" style="border-radius:12px;">
                <a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block; padding:14px 26px; font-size:15px; font-weight:700; color:#0a0f1c; text-decoration:none; border-radius:12px; background:#f59e0b;">Open my preview</a>
              </td></tr>
            </table>
            <p style="margin:0 0 6px; color:#94a3b8; font-size:13px;">Or paste this into your browser:</p>
            <p style="margin:0 0 20px; word-break:break-all; color:#f59e0b; font-size:13px;">
              <a href="${safeUrl}" style="color:#f59e0b; text-decoration:underline;">${safeUrl}</a>
            </p>
            <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:18px 0;" />
            <p style="margin:0; color:#94a3b8; font-size:12px;">
              Want to set this up for real? Reply to this email — a real person reads every message.
            </p>
          </td></tr>
          <tr><td align="center" style="padding:22px 12px 8px; color:#94a3b8; font-size:12px;">RoadWave — Privacy-first campground connections.</td></tr>
          <tr><td align="center" style="padding:0 12px 8px; color:#64748b; font-size:11px;">Sent to ${escapeHtml(toEmail)} from hello@getroadwave.com.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function buildText({ toEmail, campgroundName, previewUrl }: Args): string {
  return `Your RoadWave preview for ${campgroundName} is ready.

Open it here:
${previewUrl}

The link is live for 30 days. Want to set this up for real? Reply to this email — a real person reads every message.

Sent to ${toEmail} from hello@getroadwave.com.`
}

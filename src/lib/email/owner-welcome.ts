import QR from 'qrcode'

// Domain noreply@getroadwave.com must be verified in Resend; if it isn't,
// Resend will reject the send. RESEND_FROM_EMAIL overrides for local/dev
// (the existing pattern shared with /api/campground-lead).
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'RoadWave <noreply@getroadwave.com>'

type Args = {
  toEmail: string
  ownerName: string | null
  campgroundName: string
  qrCheckInUrl: string
  dashboardUrl: string
}

export type SendResult = { ok: boolean; error: string | null }

// Sends the owner's welcome email with their QR code embedded inline. The
// QR is generated as a PNG buffer here, base64-encoded, and attached with a
// content_id; the HTML references it via cid:roadwave-qr. This renders
// reliably on every modern email client (data: URLs in <img> get blocked
// by Gmail and others — cid attachments are the supported path).
export async function sendOwnerWelcomeEmail(args: Args): Promise<SendResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[owner-welcome] RESEND_API_KEY not set — skipping email.')
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }

  let qrBase64: string
  try {
    const buffer = await QR.toBuffer(args.qrCheckInUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 600,
      color: { dark: '#0a0f1c', light: '#ffffff' },
    })
    qrBase64 = buffer.toString('base64')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'QR render failed'
    console.error('[owner-welcome] could not render QR:', msg)
    return { ok: false, error: msg }
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
        subject: `Welcome to RoadWave — your QR code is ready`,
        html: buildHtml(args),
        text: buildText(args),
        attachments: [
          {
            filename: 'roadwave-qr.png',
            content: qrBase64,
            content_id: 'roadwave-qr',
          },
        ],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[owner-welcome] Resend rejected:', res.status, detail)
      return { ok: false, error: `Resend ${res.status}: ${detail}` }
    }
    return { ok: true, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resend send failed'
    console.error('[owner-welcome] send error:', msg)
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

function buildHtml({
  ownerName,
  campgroundName,
  dashboardUrl,
}: Args): string {
  const greeting = ownerName ? `Welcome, ${escapeHtml(ownerName)}` : 'Welcome'
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, system-ui, sans-serif; background:#0a0f1c; color:#f5ecd9; padding:24px; margin:0;">
    <table style="max-width:560px; margin:0 auto; border-collapse:collapse;">
      <tr><td>
        <p style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#f59e0b; margin:0 0 8px; font-weight:700;">RoadWave for campgrounds</p>
        <h1 style="font-size:26px; font-weight:800; color:#f5ecd9; margin:0 0 4px;">${greeting}</h1>
        <p style="font-style:italic; color:#f59e0b; font-size:18px; margin:0 0 24px;">${escapeHtml(campgroundName)} is on RoadWave.</p>

        <p style="color:#f5ecd9; line-height:1.55; margin:0 0 20px;">
          Here&apos;s your unique check-in QR code. Print it and post it at your campground entrance, in the welcome packet, on the activity board — anywhere a guest pulling in will see it.
        </p>

        <div style="background:#ffffff; border-radius:14px; padding:18px; text-align:center; margin:0 0 20px;">
          <img src="cid:roadwave-qr" alt="RoadWave check-in QR for ${escapeHtml(campgroundName)}" width="240" height="240" style="display:block; margin:0 auto; max-width:100%; height:auto;" />
          <p style="color:#0a0f1c; font-weight:700; margin:14px 0 0; font-size:14px;">${escapeHtml(campgroundName)}</p>
          <p style="color:#0a0f1c99; margin:2px 0 0; font-size:11px;">Scan to check in for 24 hours</p>
        </div>

        <p style="color:#94a3b8; font-size:13px; line-height:1.55; margin:0 0 24px;">
          When a guest scans, they&apos;re checked into your campground for 24 hours. They can wave at neighbors, see your meetups, and read your bulletin — all without sharing their site number or real name.
        </p>

        <a href="${dashboardUrl}" style="display:inline-block; background:#f59e0b; color:#0a0f1c; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:700; font-size:14px;">Open your dashboard →</a>

        <p style="color:#94a3b8; font-size:12px; margin:32px 0 0; line-height:1.55;">
          Questions, edits, or anything weird — just reply to this email. A real human reads them.
        </p>
      </td></tr>
    </table>
  </body>
</html>`
}

function buildText({
  ownerName,
  campgroundName,
  dashboardUrl,
}: Args): string {
  const greeting = ownerName ? `Welcome, ${ownerName}` : 'Welcome'
  return `${greeting} — ${campgroundName} is on RoadWave.

Your unique check-in QR is attached. Print it and post it at your campground entrance — in the welcome packet, on the activity board, anywhere a guest pulling in will see it.

When a guest scans, they're checked into your campground for 24 hours. They can wave at neighbors, see your meetups, and read your bulletin — all without sharing their site number or real name.

Open your dashboard:
${dashboardUrl}

Questions or anything weird — reply to this email. A real human reads them.`
}

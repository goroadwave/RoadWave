import QR from 'qrcode'
import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Owner welcome email — sent after a campground is provisioned. The QR
// code PNG is generated server-side and attached inline (cid:roadwave-qr)
// so it renders reliably in every modern email client.

type Args = {
  toEmail: string
  ownerName: string | null
  campgroundName: string
  qrCheckInUrl: string
  dashboardUrl: string
}

export type { SendResult }

export async function sendOwnerWelcomeEmail(args: Args): Promise<SendResult> {
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

  const greeting = args.ownerName ? `Welcome, ${escapeHtml(args.ownerName)}` : 'Welcome'
  const safeName = escapeHtml(args.campgroundName)

  const bodyHtml = `
    <p style="margin:0 0 4px; font-style:italic; color:#f59e0b; font-size:18px;">${safeName} is on RoadWave.</p>
    <p style="margin:18px 0 20px;">
      Here&rsquo;s your unique check-in QR code. Print it and post it at your campground entrance, in the welcome packet, on the activity board — anywhere a guest pulling in will see it.
    </p>
    <div style="background:#ffffff; border-radius:14px; padding:18px; text-align:center; margin:0 0 20px;">
      <img src="cid:roadwave-qr" alt="RoadWave check-in QR for ${safeName}" width="240" height="240" style="display:block; margin:0 auto; max-width:100%; height:auto;" />
      <p style="color:#0a0f1c; font-weight:700; margin:14px 0 0; font-size:14px;">${safeName}</p>
      <p style="color:#0a0f1c99; margin:2px 0 0; font-size:11px;">Scan to check in for 24 hours</p>
    </div>
    <p style="color:#94a3b8; font-size:13px; line-height:1.55; margin:0;">
      When a guest scans, they&rsquo;re checked into your campground for 24 hours. They can wave at campers, see your meetups, and read your bulletins — all without sharing their site number or real name.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `${greeting} — ${args.campgroundName} is on RoadWave.`,
    eyebrow: 'RoadWave for campgrounds',
    headline: greeting,
    bodyHtml,
    cta: { label: 'Open your dashboard →', url: args.dashboardUrl },
    secondaryNote: 'Questions, edits, or anything weird — just reply to this email. A real human reads them.',
    recipient: args.toEmail,
  })

  const text = `${greeting} — ${args.campgroundName} is on RoadWave.

Your unique check-in QR is attached. Print it and post it at your campground entrance — in the welcome packet, on the activity board, anywhere a guest pulling in will see it.

When a guest scans, they're checked into your campground for 24 hours. They can wave at campers, see your meetups, and read your bulletins — all without sharing their site number or real name.

Open your dashboard:
${args.dashboardUrl}

Questions or anything weird — reply to this email. A real human reads them.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Welcome to RoadWave — your QR code is ready',
    html,
    text,
    attachments: [
      {
        filename: 'roadwave-qr.png',
        content: qrBase64,
        contentId: 'roadwave-qr',
      },
    ],
  })
}

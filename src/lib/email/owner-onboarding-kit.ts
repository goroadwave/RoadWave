import QR from 'qrcode'
import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'

// Owner onboarding kit — sent post-payment with the printable QR + setup
// instructions + magic-link sign-in. Intentionally NOT wrapped in the
// dark-themed branded shell — this email is designed to print well, so
// the body uses a light cream background with high-contrast type.

type Args = {
  toEmail: string
  ownerName: string | null
  campgroundName: string
  qrCheckInUrl: string
  dashboardMagicLink: string
  setupCallBookingUrl?: string
}

export type { SendResult }

export async function sendOwnerOnboardingKitEmail(
  args: Args,
): Promise<SendResult> {
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
    console.error('[onboarding-kit] QR render failed:', msg)
    return { ok: false, error: msg }
  }

  const greetingName = args.ownerName?.trim() || 'there'

  const setupBlock = args.setupCallBookingUrl
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0a0f1c;">
         Want to walk through it together?
         <a href="${escapeHtml(args.setupCallBookingUrl)}"
            style="color:#b45309;text-decoration:underline;">
           Book your free 30-minute setup call
         </a>.
       </p>`
    : ''

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f5ecd9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <h1 style="margin:0 0 8px;font-size:26px;color:#0a0f1c;">Your RoadWave Campground Kit Is Ready</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#475569;">
      Hi ${escapeHtml(greetingName)} — welcome to RoadWave. Here is everything you need
      to activate ${escapeHtml(args.campgroundName)} for guests.
    </p>

    <h2 style="margin:24px 0 8px;font-size:18px;color:#0a0f1c;">1. Your campground page</h2>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#0a0f1c;">
      <a href="${escapeHtml(args.dashboardMagicLink)}"
         style="display:inline-block;background:#f59e0b;color:#0a0f1c;padding:10px 18px;border-radius:8px;font-weight:700;text-decoration:none;">
        Open your dashboard
      </a>
    </p>
    <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#475569;">
      That link signs you in and takes you straight to your dashboard.
    </p>

    <h2 style="margin:24px 0 8px;font-size:18px;color:#0a0f1c;">2. Printable QR code</h2>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#0a0f1c;">
      Print this QR and post it where guests already look:
    </p>
    <p style="margin:0 0 8px;text-align:center;">
      <img src="cid:roadwave-onboarding-qr" alt="${escapeHtml(args.campgroundName)} RoadWave QR code"
           width="220" height="220"
           style="display:inline-block;background:#fff;padding:12px;border-radius:12px;border:1px solid #e2e8f0;" />
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#475569;text-align:center;">
      Direct link:
      <a href="${escapeHtml(args.qrCheckInUrl)}" style="color:#b45309;">${escapeHtml(args.qrCheckInUrl)}</a>
    </p>
    <ul style="margin:8px 0 16px;padding-left:20px;font-size:14px;line-height:1.7;color:#0a0f1c;">
      <li>Check-in counter</li>
      <li>Welcome packet</li>
      <li>Activity board</li>
      <li>Laundry room</li>
      <li>Clubhouse</li>
      <li>Event flyer</li>
    </ul>

    <h2 style="margin:24px 0 8px;font-size:18px;color:#0a0f1c;">3. Front-desk script</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#0a0f1c;background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 14px;border-radius:6px;">
      <em>RoadWave is a private way for guests here at the campground to connect around shared interests
      — or just see our bulletins and meetups. Scan this QR code, choose your visibility (Visible, Quiet,
      Invisible, or Campground Updates Only), and wave at other campers if you want to say hello. It is
      completely optional.</em>
    </p>

    <h2 style="margin:24px 0 8px;font-size:18px;color:#0a0f1c;">4. Guest safety reminder</h2>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#0a0f1c;">
      Guests should not share exact site numbers publicly, should meet in common areas, and should call
      911 or campground staff in an emergency. RoadWave is not an emergency service.
    </p>

    ${setupBlock}

    <p style="margin:32px 0 4px;font-size:15px;color:#0a0f1c;">Welcome to the founding pilot.</p>
    <p style="margin:0;font-size:15px;color:#0a0f1c;">— Mark, RoadWave</p>
  </div>
</body></html>`.trim()

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Your RoadWave Campground Kit Is Ready',
    html,
    text: `Your RoadWave Campground Kit Is Ready

Hi ${greetingName} — welcome to RoadWave. Here is everything you need to activate ${args.campgroundName} for guests.

1. Open your dashboard: ${args.dashboardMagicLink}
2. Print and post your QR code (attached).
3. Direct check-in link: ${args.qrCheckInUrl}
${args.setupCallBookingUrl ? `4. Book a free 30-minute setup call: ${args.setupCallBookingUrl}\n` : ''}

— Mark, RoadWave`,
    attachments: [
      {
        filename: 'roadwave-qr.png',
        content: qrBase64,
        contentId: 'roadwave-onboarding-qr',
      },
    ],
  })
}

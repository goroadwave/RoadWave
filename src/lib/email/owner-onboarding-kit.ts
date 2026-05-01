import QR from 'qrcode'

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'RoadWave <hello@getroadwave.com>'

type Args = {
  toEmail: string
  ownerName: string | null
  campgroundName: string
  qrCheckInUrl: string
  dashboardMagicLink: string
  setupCallBookingUrl?: string
}

export type SendResult = { ok: boolean; error: string | null }

// Sends the post-payment onboarding kit per the spec.
// Subject: Your RoadWave Campground Kit Is Ready
// Includes: campground RoadWave link + printable QR + front-desk
// script + suggested QR placements + safety reminder + optional
// setup-call link + warm closing from Mark.
export async function sendOwnerOnboardingKitEmail(args: Args): Promise<SendResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[onboarding-kit] RESEND_API_KEY not set — skipping email.')
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
    console.error('[onboarding-kit] QR render failed:', msg)
    return { ok: false, error: msg }
  }

  const greetingName = args.ownerName?.trim() || 'there'

  const setupBlock = args.setupCallBookingUrl
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0a0f1c;">
         Want to walk through it together?
         <a href="${esc(args.setupCallBookingUrl)}"
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
      Hi ${esc(greetingName)} — welcome to RoadWave. Here is everything you need
      to activate ${esc(args.campgroundName)} for guests.
    </p>

    <h2 style="margin:24px 0 8px;font-size:18px;color:#0a0f1c;">1. Your campground page</h2>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#0a0f1c;">
      <a href="${esc(args.dashboardMagicLink)}"
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
      <img src="cid:roadwave-onboarding-qr" alt="${esc(args.campgroundName)} RoadWave QR code"
           width="220" height="220"
           style="display:inline-block;background:#fff;padding:12px;border-radius:12px;border:1px solid #e2e8f0;" />
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#475569;text-align:center;">
      Direct link:
      <a href="${esc(args.qrCheckInUrl)}" style="color:#b45309;">${esc(args.qrCheckInUrl)}</a>
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
        subject: 'Your RoadWave Campground Kit Is Ready',
        html,
        attachments: [
          {
            filename: 'roadwave-qr.png',
            content: qrBase64,
            content_id: 'roadwave-onboarding-qr',
          },
        ],
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Resend ${res.status}: ${text}` }
    }
    return { ok: true, error: null }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Email send failed',
    }
  }
}

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

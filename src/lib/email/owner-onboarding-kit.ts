import QR from 'qrcode'
import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import {
  buildBrandedHtml,
  renderEmailSection,
} from '@/lib/email/templates/base-html'

// Owner onboarding kit — sent post-Stripe-checkout once the campground
// has been provisioned. Trial-activation framing (NOT "payment
// received" — Stripe captures $0 today and starts a 30-day trial),
// printable QR for the front desk, and a clear next-steps list.
//
// The QR PNG is generated server-side and attached inline as
// cid:roadwave-onboarding-qr so it renders reliably in Gmail / Apple
// Mail / Outlook without an external image fetch.

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
  const safeCampground = escapeHtml(args.campgroundName)
  const safeGreeting = escapeHtml(greetingName)
  const safeDashboard = escapeHtml(args.dashboardMagicLink)
  const safeQrUrl = escapeHtml(args.qrCheckInUrl)

  // Section 1 — Campground page intro. Sets the tone: trial active,
  // $0 due, campground is live.
  const campgroundSection = renderEmailSection({
    title: 'Your campground page',
    bodyHtml: `
      <p style="margin:0 0 10px; color:#f5ecd9;">
        <strong>${safeCampground}</strong> is live on RoadWave. Guests can
        check in privately from their phone — no app store, no public group
        chat.
      </p>
      <p style="margin:0; color:#94a3b8; font-size:13px;">
        Your dashboard link signs you in automatically. Bookmark it.
      </p>
    `,
  })

  // Section 2 — Printable QR. The QR PNG sits on a white inner card so
  // cameras can scan it reliably regardless of email theme. The cid:
  // reference is wired up by the attachments array below.
  const qrSection = renderEmailSection({
    title: 'Printable QR code',
    bodyHtml: `
      <p style="margin:0 0 14px;">
        Print this and share it at the front desk, welcome packet, activity
        board, or check-in counter.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
        <tr>
          <td bgcolor="#ffffff" align="center" style="background:#ffffff; border-radius:12px; padding:18px;">
            <img src="cid:roadwave-onboarding-qr"
                 alt="${safeCampground} RoadWave check-in QR code"
                 width="220" height="220"
                 style="display:block; margin:0 auto; width:220px; height:220px; max-width:100%;" />
            <p style="margin:14px 0 0; color:#0a0f1c; font-weight:700; font-size:14px;">${safeCampground}</p>
            <p style="margin:2px 0 0; color:#475569; font-size:11px;">Scan to check in for 24 hours</p>
          </td>
        </tr>
      </table>
      <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.5;">
        Direct link:
        <a href="${safeQrUrl}" style="color:#f59e0b; text-decoration:underline;">${safeQrUrl}</a>
      </p>
    `,
  })

  // Section 3 — What to do next. Four numbered actions, ordered by
  // owner energy required.
  const nextSection = renderEmailSection({
    title: 'What to do next',
    bodyHtml: `
      <ol style="margin:0; padding-left:22px; color:#f5ecd9; font-size:15px; line-height:1.7;">
        <li style="margin:0 0 6px;">
          <a href="${safeDashboard}" style="color:#f59e0b; text-decoration:underline;">Open your dashboard</a>
          and take a look around.
        </li>
        <li style="margin:0 0 6px;">Review your campground profile so guests see the right name, city, and amenities.</li>
        <li style="margin:0 0 6px;">Print the QR code above and post it where guests already look.</li>
        <li style="margin:0;">Invite guests to check in — they wave at campers and read your bulletins, on their terms.</li>
      </ol>
    `,
  })

  // Optional setup-call line. Off by default; set
  // setupCallBookingUrl when you want to surface it.
  const setupBlock = args.setupCallBookingUrl
    ? renderEmailSection({
        bodyHtml: `
          <p style="margin:0; color:#cbd3e0;">
            Want to walk through it together?
            <a href="${escapeHtml(args.setupCallBookingUrl)}" style="color:#f59e0b; text-decoration:underline;">
              Book your free 30-minute setup call
            </a>.
          </p>
        `,
      })
    : ''

  // Body composed from the sections above. The intro paragraph sits
  // outside any section so the trial line reads as a hero statement.
  const bodyHtml = `
    <p style="margin:0 0 8px; color:#f5ecd9; font-size:17px;">
      Hi ${safeGreeting} — welcome to the founding pilot.
    </p>
    <p style="margin:0 0 18px; color:#cbd3e0;">
      Your 30-day trial is active. <strong style="color:#f5ecd9;">$0 due today.</strong>
      Below is everything you need to activate ${safeCampground} for guests.
    </p>
    ${campgroundSection}
    ${qrSection}
    ${nextSection}
    ${setupBlock}
  `

  const html = buildBrandedHtml({
    preheader: `Trial activated — ${args.campgroundName} is on RoadWave. $0 due today.`,
    eyebrow: 'Trial activated',
    headline: 'Your RoadWave Campground Kit Is Ready',
    bodyHtml,
    cta: { label: 'Open Your Dashboard', url: args.dashboardMagicLink },
    secondaryNote:
      'Need help? Email <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a> — a real human reads every message.',
    recipient: args.toEmail,
  })

  // Plaintext fallback for clients that don't render HTML and for
  // spam-filter scoring.
  const text = `Your RoadWave Campground Kit Is Ready

Hi ${greetingName} — welcome to the founding pilot.

Your 30-day trial is active. $0 due today.
${args.campgroundName} is live on RoadWave.

Open your dashboard:
${args.dashboardMagicLink}

Printable QR code (attached): roadwave-qr.png
Direct check-in link: ${args.qrCheckInUrl}
Share it at the front desk, welcome packet, activity board, or check-in counter.

What to do next:
  1. Open your dashboard and take a look around.
  2. Review your campground profile.
  3. Print the QR code and post it where guests already look.
  4. Invite guests to check in.
${args.setupCallBookingUrl ? `\nWant to walk through it together? Book your free 30-minute setup call: ${args.setupCallBookingUrl}\n` : ''}
Need help? Email hello@getroadwave.com — a real human reads every message.

— Mark, RoadWave`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Your RoadWave Campground Kit Is Ready',
    html,
    text,
    attachments: [
      {
        filename: 'roadwave-qr.png',
        content: qrBase64,
        contentId: 'roadwave-onboarding-qr',
      },
    ],
  })
}

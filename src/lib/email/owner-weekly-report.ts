import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Monday-morning weekly summary email. Sent by /api/cron/owner-weekly-report
// once per active campground with a non-null owner_email — including when
// every stat is zero (the spec calls for "keep owners aware" even on a
// dead week). Subject line is verbatim from the spec.

export type WeeklyReportStats = {
  qrScans: number
  checkIns: number
  reviewClicks: number
  bookAgainClicks: number
  contactMessages: number
  bulletinViews: number
}

type Args = {
  toEmail: string
  ownerName: string | null
  campgroundName: string
  stats: WeeklyReportStats
  dashboardUrl: string
  /** Window label shown to the owner — e.g. "May 5 – May 11, 2026". */
  windowLabel: string
}

export type { SendResult }

const PALETTE = {
  cream: '#f5ecd9',
  flame: '#f59e0b',
  mist: '#94a3b8',
}

function statRow(label: string, value: number): string {
  return `
    <tr>
      <td style="padding:10px 14px; color:${PALETTE.mist}; font-size:14px; border-bottom:1px solid rgba(255,255,255,0.06);">${escapeHtml(label)}</td>
      <td style="padding:10px 14px; color:${PALETTE.cream}; font-size:18px; font-weight:700; text-align:right; border-bottom:1px solid rgba(255,255,255,0.06);">${value.toLocaleString()}</td>
    </tr>
  `
}

export async function sendOwnerWeeklyReportEmail(
  args: Args,
): Promise<SendResult> {
  const greeting = args.ownerName ? `Hi ${args.ownerName}` : 'Hi there'
  const safeName = escapeHtml(args.campgroundName)
  const totalActivity =
    args.stats.qrScans +
    args.stats.checkIns +
    args.stats.reviewClicks +
    args.stats.bookAgainClicks +
    args.stats.contactMessages +
    args.stats.bulletinViews

  const summaryHook = totalActivity === 0
    ? `It was a quiet week — no scans yet. If your QR isn't up at the welcome sign, that's the fastest way to change next week's numbers.`
    : `Here's what happened at <strong style="color:${PALETTE.cream};">${safeName}</strong> over the past 7 days.`

  const bodyHtml = `
    <p style="margin:0 0 18px;">${greeting} — your RoadWave summary for ${escapeHtml(args.windowLabel)}.</p>
    <p style="margin:0 0 20px;">${summaryHook}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden; margin:0 0 20px;">
      ${statRow('QR scans', args.stats.qrScans)}
      ${statRow('Guest check-ins', args.stats.checkIns)}
      ${statRow('Review link clicks', args.stats.reviewClicks)}
      ${statRow('Book Again clicks', args.stats.bookAgainClicks)}
      ${statRow('Office contact messages', args.stats.contactMessages)}
      ${statRow('Bulletin views', args.stats.bulletinViews)}
    </table>
    <p style="margin:0; color:${PALETTE.mist}; font-size:13px; line-height:1.55;">
      Open your dashboard for the live week-to-date counts, your QR code,
      and the Promo Kit PDFs.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `Past 7 days at ${args.campgroundName}: ${args.stats.qrScans} scans, ${args.stats.checkIns} check-ins.`,
    eyebrow: 'Weekly summary',
    headline: 'Your RoadWave week',
    bodyHtml,
    cta: { label: 'Open your dashboard →', url: args.dashboardUrl },
    secondaryNote:
      'Reply to this email any time — a real human reads them. Want fewer emails? We&rsquo;ll add a preference toggle soon; just reply and we&rsquo;ll pause yours.',
    recipient: args.toEmail,
  })

  const text = `${greeting} — your RoadWave summary for ${args.windowLabel}.

${args.campgroundName} · past 7 days
  QR scans:                ${args.stats.qrScans}
  Guest check-ins:         ${args.stats.checkIns}
  Review link clicks:      ${args.stats.reviewClicks}
  Book Again clicks:       ${args.stats.bookAgainClicks}
  Office contact messages: ${args.stats.contactMessages}
  Bulletin views:          ${args.stats.bulletinViews}

Open your dashboard:
${args.dashboardUrl}

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: `Your RoadWave Weekly Summary — ${args.campgroundName}`,
    html,
    text,
  })
}

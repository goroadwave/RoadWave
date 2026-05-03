import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// "Your demo is ready" email — sent when a campground owner asks to
// email themselves their preview link.

type Args = {
  toEmail: string
  campgroundName: string
  previewUrl: string
}

export type { SendResult }

export async function sendDemoLinkEmail(args: Args): Promise<SendResult> {
  const safeUrl = escapeHtml(args.previewUrl)
  const safeName = escapeHtml(args.campgroundName)

  const bodyHtml = `
    <p style="margin:0 0 18px;">
      Here&rsquo;s your branded RoadWave preview for <strong style="color:#f5ecd9;">${safeName}</strong>.
      The link works for the next 30 days — share it with your team or partners however you like.
    </p>
    <p style="margin:0 0 6px; color:#94a3b8; font-size:13px;">Or paste this into your browser:</p>
    <p style="margin:0; word-break:break-all; color:#f59e0b; font-size:13px;">
      <a href="${safeUrl}" style="color:#f59e0b; text-decoration:underline;">${safeUrl}</a>
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `Your RoadWave preview for ${args.campgroundName} is ready.`,
    eyebrow: 'Your preview is ready',
    headline: args.campgroundName,
    bodyHtml,
    cta: { label: 'Open my preview', url: args.previewUrl },
    secondaryNote: 'Want to set this up for real? Reply to this email — a real person reads every message.',
    recipient: args.toEmail,
  })

  const text = `Your RoadWave preview for ${args.campgroundName} is ready.

Open it here:
${args.previewUrl}

The link is live for 30 days. Want to set this up for real? Reply to this email — a real person reads every message.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: `Your RoadWave preview for ${args.campgroundName}`,
    html,
    text,
  })
}

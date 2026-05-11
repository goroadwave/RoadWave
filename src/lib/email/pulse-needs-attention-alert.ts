import { escapeHtml, sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Owner alert email for a guest who tapped "Something needs attention"
// on the Pulse Check and then submitted the follow-up form. Subject
// line is intentionally urgent-feeling but not alarmist; this is the
// signal an owner most wants to see in the inbox preview pane.

type Args = {
  toEmail: string
  campgroundName: string
  body: string
  guestContact: string | null
  dashboardUrl: string
}

export type { SendResult }

export async function sendPulseNeedsAttentionEmail(
  args: Args,
): Promise<SendResult> {
  const safeName = escapeHtml(args.campgroundName)
  const safeBody = escapeHtml(args.body).replace(/\n/g, '<br />')
  const safeContact = args.guestContact ? escapeHtml(args.guestContact) : null

  const contactRow = safeContact
    ? `<p style="margin:14px 0 0; color:#94a3b8; font-size:13px;"><strong style="color:#f5ecd9;">Guest contact:</strong> ${safeContact}</p>`
    : `<p style="margin:14px 0 0; color:#64748b; font-size:12px; font-style:italic;">Guest did not leave a contact pointer.</p>`

  const bodyHtml = `
    <p style="margin:0 0 14px;">A guest at <strong style="color:#f5ecd9;">${safeName}</strong> tapped <strong style="color:#f5ecd9;">&ldquo;Something needs attention&rdquo;</strong> on the Stay Feedback prompt and left this note:</p>
    <div style="background:#0a0f1c; border:1px solid rgba(245,158,11,0.35); border-radius:12px; padding:16px 18px; margin:0 0 4px;">
      <p style="margin:0; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">Needs attention</p>
      <p style="margin:10px 0 0; color:#cbd3e0; font-size:15px; line-height:1.55;">${safeBody}</p>
      ${contactRow}
    </div>
    <p style="margin:16px 0 0; color:#94a3b8; font-size:13px; line-height:1.55;">
      The guest also still sees your Leave a Google Review button (when enabled). Resolving this fast gives you the best shot at flipping a low-pulse stay into a good review.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `A guest at ${args.campgroundName} flagged something needs attention.`,
    eyebrow: 'Stay Feedback alert',
    headline: 'A guest needs attention',
    bodyHtml,
    cta: { label: 'Open messages →', url: args.dashboardUrl },
    secondaryNote:
      'Want fewer emails? Turn off email notifications on the dashboard Engagement section.',
    recipient: args.toEmail,
  })

  const text = `A guest at ${args.campgroundName} tapped "Something needs attention" and left this note:

${args.body}
${args.guestContact ? `\nGuest contact: ${args.guestContact}\n` : ''}
Open messages: ${args.dashboardUrl}

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: `A guest needs attention — ${args.campgroundName}`,
    html,
    text,
  })
}

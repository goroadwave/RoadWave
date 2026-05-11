import { escapeHtml, sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Owner alert email for a new categorized Contact the Office message.
// Sent only when the campground has email_notifications_enabled = true
// and owner_email is non-null. Subject names the category so a busy
// owner can triage from the inbox preview pane.

const CATEGORY_LABEL: Record<string, string> = {
  wifi: 'Wi-Fi',
  laundry: 'Laundry',
  propane: 'Propane',
  late_checkout: 'Late checkout',
  maintenance: 'Maintenance',
  quiet_hours: 'Quiet hours / noise concern',
  local_recommendations: 'Local recommendations',
  activities: 'Activities',
  general_question: 'General question',
}

type Args = {
  toEmail: string
  campgroundName: string
  /** Slug-form category — looked up in CATEGORY_LABEL. */
  category: string
  body: string
  /** Optional contact pointer the guest left. */
  guestContact: string | null
  dashboardUrl: string
}

export type { SendResult }

export async function sendContactMessageEmail(args: Args): Promise<SendResult> {
  const label = CATEGORY_LABEL[args.category] ?? args.category
  const safeName = escapeHtml(args.campgroundName)
  const safeLabel = escapeHtml(label)
  const safeBody = escapeHtml(args.body).replace(/\n/g, '<br />')
  const safeContact = args.guestContact ? escapeHtml(args.guestContact) : null

  const contactRow = safeContact
    ? `<p style="margin:14px 0 0; color:#94a3b8; font-size:13px;"><strong style="color:#f5ecd9;">Guest contact:</strong> ${safeContact}</p>`
    : `<p style="margin:14px 0 0; color:#64748b; font-size:12px; font-style:italic;">Guest did not leave a contact pointer.</p>`

  const bodyHtml = `
    <p style="margin:0 0 14px;">A guest at <strong style="color:#f5ecd9;">${safeName}</strong> just sent a message through the Contact the Office form.</p>
    <div style="background:#0a0f1c; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px 18px; margin:0 0 4px;">
      <p style="margin:0; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">${safeLabel}</p>
      <p style="margin:10px 0 0; color:#cbd3e0; font-size:15px; line-height:1.55;">${safeBody}</p>
      ${contactRow}
    </div>
  `

  const html = buildBrandedHtml({
    preheader: `${label} — new message from a guest at ${args.campgroundName}.`,
    eyebrow: 'New guest message',
    headline: `${label} request`,
    bodyHtml,
    cta: { label: 'Open messages →', url: args.dashboardUrl },
    secondaryNote:
      'Want fewer emails? Turn off email notifications on the dashboard Engagement section.',
    recipient: args.toEmail,
  })

  const text = `New guest message at ${args.campgroundName} — category: ${label}.

${args.body}
${args.guestContact ? `\nGuest contact: ${args.guestContact}\n` : ''}
Open messages: ${args.dashboardUrl}

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: `New ${label.toLowerCase()} message — ${args.campgroundName}`,
    html,
    text,
  })
}

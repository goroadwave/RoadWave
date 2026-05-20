import { escapeHtml, sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Guest notification email -- sent when a campground office replies to
// a Contact the Office message. Goes through Resend the same way every
// other transactional email in the app does. Skipped silently by the
// caller when:
//   * the guest didn't provide an email (preferred_contact_method !=
//     'email' AND no email field), or
//   * the campground has email_notifications_enabled = false.
//
// The email never embeds PII other than what the guest themselves
// submitted (their site number + last name -- both shown so they
// recognize the thread). The reply body is included verbatim. The
// reply URL is the same token-gated /m/<id>?t=<token> link the
// post-submit confirmation screen shows; the guest will still be
// prompted for site + last name on that page before the thread
// loads (validated by the guest_message_thread RPC, mig 0055).

type Args = {
  toEmail: string
  campgroundName: string
  replyBody: string
  replyUrl: string
  siteNumber: string | null
  lastName: string | null
}

export type { SendResult }

export async function sendContactMessageReplyEmail(
  args: Args,
): Promise<SendResult> {
  const safeName = escapeHtml(args.campgroundName)
  const safeBody = escapeHtml(args.replyBody).replace(/\n/g, '<br />')
  const safeSite = args.siteNumber ? escapeHtml(args.siteNumber) : null
  const safeLast = args.lastName ? escapeHtml(args.lastName) : null

  const meta =
    safeSite && safeLast
      ? `<p style="margin:14px 0 0; color:#94a3b8; font-size:12px;">
           This reply is for the message you sent about
           <strong style="color:#f5ecd9;">site ${safeSite}</strong>
           (${safeLast}). When you open the link below, you'll be
           asked to confirm both before the thread loads.
         </p>`
      : ''

  const bodyHtml = `
    <p style="margin:0 0 14px;">The office at <strong style="color:#f5ecd9;">${safeName}</strong> just replied to your message.</p>
    <div style="background:#0a0f1c; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px 18px; margin:0 0 4px;">
      <p style="margin:0; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">Office reply</p>
      <p style="margin:10px 0 0; color:#cbd3e0; font-size:15px; line-height:1.55;">${safeBody}</p>
      ${meta}
    </div>
    <p style="margin:14px 0 0; color:#64748b; font-size:12px; font-style:italic;">
      Tap the button to open the private thread. The link is for you only -- the office can see the same thread from their dashboard, but it isn't shared with other campers.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `${args.campgroundName} replied to your message.`,
    eyebrow: 'Office reply',
    headline: `${args.campgroundName} replied`,
    bodyHtml,
    cta: { label: 'View reply', url: args.replyUrl },
    secondaryNote:
      'You can reply back from that page too -- the thread is private between you and the office.',
    recipient: args.toEmail,
  })

  const text = `The office at ${args.campgroundName} replied to your message:

${args.replyBody}

View the full thread (you'll be asked to confirm your site number${args.lastName ? ' and last name' : ''}):
${args.replyUrl}

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: `Reply from ${args.campgroundName}`,
    html,
    text,
  })
}

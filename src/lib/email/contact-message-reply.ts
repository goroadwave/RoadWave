import { escapeHtml, sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Guest notification email -- sent when a campground office replies to
// a Contact the Office message. Goes through Resend the same way every
// other transactional email in the app does. Skipped silently by the
// caller when:
//   * the guest didn't provide an email, or
//   * the campground has email_notifications_enabled = false.
//
// PRIVACY: this is a NOTICE-only email. It deliberately does NOT
// include the reply body verbatim -- the body shows only on the
// token-gated /m/<id>?t=<token>&from=<slug> page after the camper
// re-confirms site number + last name. The email preview pane (which
// many people leave visible on a phone lock screen / shared laptop)
// therefore never leaks the office's actual message content.

type Args = {
  toEmail: string
  campgroundName: string
  replyUrl: string
}

export type { SendResult }

export async function sendContactMessageReplyEmail(
  args: Args,
): Promise<SendResult> {
  const safeName = escapeHtml(args.campgroundName)

  const bodyHtml = `
    <p style="margin:0 0 14px;">The campground office at <strong style="color:#f5ecd9;">${safeName}</strong> replied to your message.</p>
    <p style="margin:0 0 4px; color:#cbd3e0; font-size:15px; line-height:1.55;">
      Open the private thread to view the reply. We'll ask you to
      confirm your site number and last name before the thread loads --
      that keeps the reply private to you.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `${args.campgroundName} replied to your message.`,
    eyebrow: 'Office reply',
    headline: 'The campground office replied to your message',
    bodyHtml,
    cta: { label: 'View office reply', url: args.replyUrl },
    secondaryNote:
      'You can reply back from that page too -- the thread is private between you and the office.',
    recipient: args.toEmail,
  })

  const text = `The campground office at ${args.campgroundName} replied to your message.

Open the private thread (we'll ask you to confirm your site number and last name first):
${args.replyUrl}

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'The campground office replied to your message',
    html,
    text,
  })
}

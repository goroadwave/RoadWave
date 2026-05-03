import { sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Triggered by the Stripe webhook on invoice.payment_failed. Tells the
// owner the charge failed, links them straight to the customer portal
// to update the card. Stripe's own dunning emails are good but
// inconsistently delivered — branding + a direct link to /api/stripe/portal
// makes the recovery path obvious.

type Args = {
  toEmail: string
  ownerName: string | null
  campgroundName: string
  amountFormatted: string // e.g. "$39.00"
  portalUrl: string
}

export type { SendResult }

export async function sendPaymentFailedEmail(args: Args): Promise<SendResult> {
  const greeting = args.ownerName ? `Hi ${args.ownerName}` : 'Hi there'

  const bodyHtml = `
    <p style="margin:0 0 18px;">
      ${greeting} — Stripe couldn&rsquo;t process your latest RoadWave charge of
      <strong style="color:#f5ecd9;">${args.amountFormatted}</strong>
      for <strong style="color:#f5ecd9;">${args.campgroundName}</strong>.
    </p>
    <p style="margin:0 0 18px;">
      The most common reasons are an expired card or a bank decline. Open the
      customer portal to update your payment method — your campground stays
      live for a few days while we retry the charge.
    </p>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      No action from us until you fix the payment method or cancel.
      RoadWave doesn&rsquo;t suspend your guests&rsquo; experience over a single
      failed charge.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `Your RoadWave charge of ${args.amountFormatted} for ${args.campgroundName} failed.`,
    eyebrow: 'Payment failed',
    headline: 'We couldn’t process your last charge',
    bodyHtml,
    cta: { label: 'Update payment method →', url: args.portalUrl },
    secondaryNote: 'Questions? Reply to this email or write to <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a>.',
    recipient: args.toEmail,
  })

  const text = `${greeting} — Stripe couldn't process your latest RoadWave charge of ${args.amountFormatted} for ${args.campgroundName}.

Update your payment method to keep your campground page live:
${args.portalUrl}

We don't suspend your guests' experience over a single failed charge — but if the retries don't go through, the page will eventually be paused.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: `Action required: payment failed for ${args.campgroundName}`,
    html,
    text,
  })
}

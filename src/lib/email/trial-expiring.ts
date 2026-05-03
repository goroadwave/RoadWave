import { sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Sent ~4 days before the campground's trial_ends_at by the daily
// /api/cron/trial-expiring handler. Idempotency is enforced by stamping
// trial_expiring_email_sent_at on the campground row after a successful
// send — same pattern as welcome_email_sent_at.

type Args = {
  toEmail: string
  ownerName: string | null
  campgroundName: string
  trialEndsAt: string // ISO date or human-formatted; whatever caller passes
  billingUrl: string
  daysRemaining: number
}

export type { SendResult }

export async function sendTrialExpiringEmail(args: Args): Promise<SendResult> {
  const greeting = args.ownerName ? `Hi ${args.ownerName}` : 'Hi there'
  const days = args.daysRemaining

  const bodyHtml = `
    <p style="margin:0 0 18px;">
      ${greeting} — heads up that your RoadWave trial for
      <strong style="color:#f5ecd9;">${args.campgroundName}</strong>
      ends ${days <= 1 ? 'tomorrow' : `in ${days} days`}.
    </p>
    <p style="margin:0 0 18px;">
      Add a payment method by then and your founding pilot stays active
      at $39/month with no break in service. Cancel any time from the
      same page.
    </p>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      Trial ends on <strong style="color:#f5ecd9;">${args.trialEndsAt}</strong>.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `Your RoadWave trial for ${args.campgroundName} ends in ${days} day${days === 1 ? '' : 's'}.`,
    eyebrow: 'Trial ending soon',
    headline: 'Keep your campground page live',
    bodyHtml,
    cta: { label: 'Add payment method →', url: args.billingUrl },
    secondaryNote: 'Questions? Reply to this email — a real human reads them.',
    recipient: args.toEmail,
  })

  const text = `${greeting} — heads up that your RoadWave trial for ${args.campgroundName} ends ${days <= 1 ? 'tomorrow' : `in ${days} days`} (${args.trialEndsAt}).

Add a payment method to keep your founding pilot active at $39/month:
${args.billingUrl}

Cancel any time from the same page.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: `Your RoadWave trial ends ${days <= 1 ? 'tomorrow' : `in ${days} days`}`,
    html,
    text,
  })
}

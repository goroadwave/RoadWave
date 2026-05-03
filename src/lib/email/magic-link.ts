import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Branded magic-link template for owner sign-in. The owner onboarding
// flow already builds a magic link via supabase.auth.admin.generateLink
// and ships it inside the kit email. This template is the standalone
// version — Custom SMTP / Send-Email hook surfaces it as the default
// magic-link email replacing Supabase's built-in template.

type Args = {
  toEmail: string
  magicLinkUrl: string
  campgroundName?: string | null
}

export type { SendResult }

export async function sendMagicLinkEmail(args: Args): Promise<SendResult> {
  const safeName = args.campgroundName ? escapeHtml(args.campgroundName) : null

  const bodyHtml = `
    <p style="margin:0 0 18px;">
      Tap the button below to sign in to RoadWave${safeName ? ` for <strong style="color:#f5ecd9;">${safeName}</strong>` : ''}.
      The link is good for the next hour and works on any device.
    </p>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      Didn&rsquo;t request this? You can safely ignore this email — no one can
      sign in without it.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: 'Sign in to RoadWave with this magic link.',
    eyebrow: 'Magic sign-in link',
    headline: 'Open RoadWave',
    bodyHtml,
    cta: { label: 'Sign in now', url: args.magicLinkUrl },
    secondaryNote: 'Questions? Write to <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a>.',
    recipient: args.toEmail,
  })

  const text = `Sign in to RoadWave${args.campgroundName ? ` for ${args.campgroundName}` : ''}.

Open this link in the next hour:
${args.magicLinkUrl}

If you didn't request this, ignore this email.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Your RoadWave sign-in link',
    html,
    text,
  })
}

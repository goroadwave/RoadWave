import { sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Branded password reset template. Wired in only when Custom SMTP is
// flipped on in Supabase Authentication → SMTP, OR when a Supabase
// Send-Email auth hook routes here. Until then, Supabase's default
// transactional email handles password reset and this file isn't
// invoked by the runtime — the template just lives ready to go.

type Args = {
  toEmail: string
  resetUrl: string
}

export type { SendResult }

export async function sendPasswordResetEmail(args: Args): Promise<SendResult> {
  const bodyHtml = `
    <p style="margin:0 0 18px;">
      Tap the button below to choose a new password for your RoadWave
      account. The link is good for the next hour.
    </p>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      Didn&rsquo;t request this? You can safely ignore this email — your
      password won&rsquo;t change unless you click the link.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: 'Reset your RoadWave password.',
    eyebrow: 'Password reset',
    headline: 'Set a new password',
    bodyHtml,
    cta: { label: 'Reset my password', url: args.resetUrl },
    secondaryNote: 'Questions? Write to <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a>.',
    recipient: args.toEmail,
  })

  const text = `Reset your RoadWave password.

Open this link in the next hour to choose a new password:
${args.resetUrl}

If you didn't request this, ignore this email — your password won't change.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Reset your RoadWave password',
    html,
    text,
  })
}

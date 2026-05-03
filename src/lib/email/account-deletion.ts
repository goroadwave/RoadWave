import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Confirmation email sent right before we tear down the user's account.
// We send BEFORE the cascade delete because, once auth.users is gone,
// auth.users.email is too.

type Args = {
  toEmail: string
  deletedAt: string
}

export type { SendResult }

export async function sendAccountDeletionConfirmEmail(
  args: Args,
): Promise<SendResult> {
  const safeDeletedAt = escapeHtml(args.deletedAt)

  const bodyHtml = `
    <p style="margin:0 0 16px;">
      Confirming your RoadWave account and all associated data — profile, check-ins, wave history, crossed paths, and messages — were deleted on ${safeDeletedAt}.
    </p>
    <p style="margin:0 0 16px;">
      We retained a small compliance record (your user id, an email snapshot, and the timestamp) but no profile or activity data.
    </p>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      If you didn&rsquo;t request this deletion, write to
      <a href="mailto:safety@getroadwave.com" style="color:#f59e0b; text-decoration:underline;">safety@getroadwave.com</a>
      right away.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: 'Your RoadWave account has been deleted.',
    eyebrow: 'Account deleted',
    headline: 'Your data has been deleted.',
    bodyHtml,
    secondaryNote:
      'Questions? Write to <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a>.',
    recipient: args.toEmail,
  })

  const text = `Your RoadWave account has been deleted.

Confirming your RoadWave account and all associated data — profile, check-ins, wave history, crossed paths, and messages — were deleted on ${args.deletedAt}.

We retained a small compliance record (your user id, an email snapshot, and the timestamp) but no profile or activity data.

If you didn't request this deletion, write to safety@getroadwave.com right away.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Your RoadWave account has been deleted',
    html,
    text,
  })
}

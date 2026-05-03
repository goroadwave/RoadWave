import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// User-facing confirmation sent to the reporter after they file a safety
// report. Pairs with report-notification.ts (the internal alert).

type Args = {
  toEmail: string
  reportId: string
  category: 'low' | 'medium' | 'high'
}

export type { SendResult }

export async function sendReportConfirmationEmail(
  args: Args,
): Promise<SendResult> {
  const safeId = escapeHtml(args.reportId)
  const safeCategory = escapeHtml(args.category)

  const bodyHtml = `
    <p style="margin:0 0 18px;">
      Thanks for letting us know. Your report was received and routed to the
      RoadWave Trust &amp; Safety team. We treat every report seriously.
    </p>
    <p style="margin:0 0 18px;">
      Reference number: <strong style="color:#f5ecd9;">${safeId}</strong><br />
      Category: <strong style="color:#f5ecd9;">${safeCategory}</strong>
    </p>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      ${
        args.category === 'high'
          ? "We've already taken protective action on the reported account while we review the details. Expect a follow-up from us within 24 hours."
          : 'A team member will review the report and follow up by email if we need anything else.'
      }
    </p>
  `

  const html = buildBrandedHtml({
    preheader: 'Your RoadWave safety report was received.',
    eyebrow: 'Trust & safety',
    headline: 'We received your report',
    bodyHtml,
    secondaryNote:
      'In an emergency, call 911 first. RoadWave is not an emergency service. For urgent matters write to <a href="mailto:safety@getroadwave.com" style="color:#f59e0b;">safety@getroadwave.com</a>.',
    recipient: args.toEmail,
  })

  const text = `Your RoadWave safety report was received.

Reference: ${args.reportId}
Category: ${args.category}

${
  args.category === 'high'
    ? "We've already taken protective action on the reported account while we review. Expect a follow-up from us within 24 hours."
    : 'A team member will review the report and follow up by email if we need anything else.'
}

In an emergency, call 911 first. RoadWave is not an emergency service.
For urgent matters write to safety@getroadwave.com.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Your RoadWave report was received',
    html,
    text,
  })
}

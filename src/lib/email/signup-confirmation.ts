import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Two branded confirmation emails — one for guest signups, one for owner
// signups — sent through Resend instead of Supabase's built-in mailer. We
// drive the URL via supabase.auth.admin.generateLink({ type: 'signup' }) so
// Supabase creates the user but does NOT auto-send its global template.

const SUBJECT = 'Welcome to RoadWave 👋 — confirm your email'

export type { SendResult }

type SendArgs = {
  toEmail: string
  confirmUrl: string
}

export function sendGuestSignupConfirmEmail(args: SendArgs): Promise<SendResult> {
  return sendConfirmEmail({
    ...args,
    eyebrow: 'Welcome to RoadWave',
    headline: "You're one step away.",
    body: "You're one step away from finding your people on the road. Click below to confirm your email and get started.",
  })
}

export function sendOwnerSignupConfirmEmail(args: SendArgs): Promise<SendResult> {
  return sendConfirmEmail({
    ...args,
    eyebrow: 'For campground owners',
    headline: "You're one step away.",
    body: "You're one step away from helping your guests meet each other. Click below to confirm your email and get started.",
  })
}

type InternalArgs = SendArgs & {
  eyebrow: string
  headline: string
  body: string
}

async function sendConfirmEmail(args: InternalArgs): Promise<SendResult> {
  const safeUrl = escapeHtml(args.confirmUrl)
  const safeBody = escapeHtml(args.body)

  const bodyHtml = `
    <p style="margin:0 0 24px;">${safeBody}</p>
    <p style="margin:0 0 6px; color:#94a3b8; font-size:13px;">Or paste this link into your browser:</p>
    <p style="margin:0; word-break:break-all; color:#f59e0b; font-size:13px;">
      <a href="${safeUrl}" style="color:#f59e0b; text-decoration:underline;">${safeUrl}</a>
    </p>
  `

  const html = buildBrandedHtml({
    preheader: args.body,
    eyebrow: args.eyebrow,
    headline: args.headline,
    bodyHtml,
    cta: { label: 'Confirm my email', url: args.confirmUrl },
    secondaryNote:
      "If you didn't sign up for RoadWave, you can safely ignore this email — no account will be created. Questions? Write to <a href=\"mailto:hello@getroadwave.com\" style=\"color:#f59e0b;\">hello@getroadwave.com</a>.",
    recipient: args.toEmail,
  })

  const text = `${args.body}

Confirm your email:
${args.confirmUrl}

If you didn't sign up for RoadWave, you can ignore this email — no account will be created.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: SUBJECT,
    html,
    text,
  })
}

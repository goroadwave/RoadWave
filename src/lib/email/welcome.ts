import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Sent once on a user's first successful auth — both Google OAuth
// (where the OAuth callback IS the first verification) and email +
// password (where clicking the confirmation link is). Triggered from
// src/lib/auth/post-auth-redirect.ts when the auth handler detects
// a fresh email_confirmed_at timestamp, regardless of provider.
// Repeat sign-ins skip the trigger because email_confirmed_at stops
// updating after the first verification.

type Args = {
  toEmail: string
  /** Display name pulled from user.user_metadata.full_name when
   *  available (Google sets it), or null for email/password signups
   *  where we don't have it yet. Falls back to a generic greeting. */
  fullName?: string | null
  /** Absolute URL where the user lands when they tap the CTA. Defaults
   *  to the production /home if not provided. */
  homeUrl?: string
}

export type { SendResult }

export async function sendWelcomeEmail(args: Args): Promise<SendResult> {
  const firstName = (args.fullName ?? '').trim().split(/\s+/)[0] ?? ''
  const greeting = firstName ? `Welcome, ${escapeHtml(firstName)}` : 'Welcome to RoadWave'

  const homeUrl = args.homeUrl ?? 'https://www.getroadwave.com/home'

  const bodyHtml = `
    <p style="margin:0 0 18px;">
      You&rsquo;re in. RoadWave is a private campground guest amenity —
      scan a QR code at the campground you&rsquo;re staying at, find
      campers who share your interests, and say hello only when both
      people choose to wave.
    </p>
    <ul style="margin:0 0 18px; padding-left:20px; color:#f5ecd9; font-size:15px; line-height:1.6;">
      <li>No exact site numbers</li>
      <li>No public group chat</li>
      <li>Visible, Quiet, Invisible, or Campground Updates Only — your call</li>
    </ul>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      Next time you pull into a RoadWave-ready campground, scan the QR.
      Until then, take a look around.
    </p>
  `

  const html = buildBrandedHtml({
    preheader: "You're in. Here's how RoadWave works.",
    eyebrow: 'Welcome aboard',
    headline: greeting,
    bodyHtml,
    cta: { label: 'Open RoadWave', url: homeUrl },
    secondaryNote:
      'Questions? Reply to this email or write to <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a> — a real human reads every message.',
    recipient: args.toEmail,
  })

  const text = `${greeting} 🏕️

You're in. RoadWave is a private campground guest amenity — scan a QR code at the campground you're staying at, find campers who share your interests, and say hello only when both people choose to wave.

— No exact site numbers
— No public group chat
— Visible, Quiet, Invisible, or Campground Updates Only — your call

Next time you pull into a RoadWave-ready campground, scan the QR. Until then, take a look around: ${homeUrl}

Questions? Reply to this email or write to hello@getroadwave.com — a real human reads every message.

Sent to ${args.toEmail} from hello@getroadwave.com.`

  return sendBrandedEmail({
    to: args.toEmail,
    subject: 'Welcome to RoadWave 🏕️',
    html,
    text,
  })
}

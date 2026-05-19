import { escapeHtml, sendBrandedEmail, type SendResult } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'

// Internal "new campground trial started" alert. Sent to the RoadWave
// admin inbox AFTER the owner-onboarding email goes out, so the owner-
// facing email is always the critical path; this alert is informational
// noise for the founder.
//
// Recipient resolution: INTERNAL_NEW_OWNER_NOTIFY_EMAIL env var. Accepts
// a single address or a comma-separated list. Defaults to
// hello@getroadwave.com when unset. The env var only ever contains
// email addresses — never API keys, never webhook secrets — so it is
// safe to read and pass through to Resend.
//
// Failure mode: callers should wrap this in try/catch and treat
// failures as non-fatal. The webhook handler must NEVER 5xx because
// the founder's inbox got rate-limited.

type Args = {
  campgroundName: string
  campgroundSlug: string
  ownerEmail: string
  ownerName: string | null
  signupAt: Date
  /** Stripe customer id from the Checkout session (cus_…). */
  stripeCustomerId: string | null
  /** Stripe subscription id from the Checkout session (sub_…). */
  stripeSubscriptionId: string | null
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled'
  plan: 'monthly' | 'annual' | null
  trialEndsAt: Date | null
  /** Public welcome page for the new campground. */
  campgroundUrl: string
  /** Admin-side campground list. */
  adminCampgroundsUrl: string
}

export type { SendResult }

const DEFAULT_RECIPIENT = 'hello@getroadwave.com'

function resolveRecipients(): string[] {
  const raw = (process.env.INTERNAL_NEW_OWNER_NOTIFY_EMAIL ?? '').trim()
  if (!raw) return [DEFAULT_RECIPIENT]
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function formatDate(d: Date): string {
  // YYYY-MM-DD HH:MM UTC. Stable, unambiguous, human-readable.
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

function formatPlan(plan: 'monthly' | 'annual' | null): string {
  if (plan === 'monthly') return 'Monthly · $39/mo'
  if (plan === 'annual') return 'Annual · $390/yr'
  return '—'
}

// Render-only helper. Returns the subject + html + text + resolved
// recipient list without touching Resend. Exported so the QA test
// suite can assert on the rendered output (e.g. no secrets leak)
// without having to mock the SDK. sendInternalNewOwnerAlert is a
// thin wrapper that calls this and then sendBrandedEmail.
export type RenderedInternalNewOwnerAlert = {
  to: string[]
  subject: string
  html: string
  text: string
}

export function renderInternalNewOwnerAlert(
  args: Args,
): RenderedInternalNewOwnerAlert {
  const recipients = resolveRecipients()

  // All values that land in HTML go through escapeHtml. Stripe object
  // ids (cus_…, sub_…) are not secrets — they're public-ish handles
  // that Stripe APIs expose — but we still escape them to defang any
  // hostile content (none expected, defensive habit).
  const safe = {
    campgroundName: escapeHtml(args.campgroundName),
    campgroundSlug: escapeHtml(args.campgroundSlug),
    ownerEmail: escapeHtml(args.ownerEmail),
    ownerName: escapeHtml(args.ownerName ?? '—'),
    signupAt: escapeHtml(formatDate(args.signupAt)),
    stripeCustomerId: escapeHtml(args.stripeCustomerId ?? '—'),
    stripeSubscriptionId: escapeHtml(args.stripeSubscriptionId ?? '—'),
    subscriptionStatus: escapeHtml(args.subscriptionStatus),
    plan: escapeHtml(formatPlan(args.plan)),
    trialEndsAt: escapeHtml(
      args.trialEndsAt ? formatDate(args.trialEndsAt) : '—',
    ),
    campgroundUrl: escapeHtml(args.campgroundUrl),
    adminCampgroundsUrl: escapeHtml(args.adminCampgroundsUrl),
  }

  // Plain two-column table. Mobile-friendly because the right column
  // is `word-break: break-all` for the Stripe IDs / URLs.
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 14px 6px 0; color:#94a3b8; font-size:13px; vertical-align:top; white-space:nowrap;">${label}</td>
      <td style="padding:6px 0; color:#f5ecd9; font-size:13px; word-break:break-all;">${value}</td>
    </tr>
  `

  const bodyHtml = `
    <p style="margin:0 0 14px; color:#cbd3e0;">
      A new campground started a 30-day trial on RoadWave.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:0 0 16px;">
      ${row('Campground', `<strong style="color:#f5ecd9;">${safe.campgroundName}</strong>`)}
      ${row('Slug', safe.campgroundSlug)}
      ${row('Owner name', safe.ownerName)}
      ${row('Owner email', `<a href="mailto:${safe.ownerEmail}" style="color:#f59e0b;">${safe.ownerEmail}</a>`)}
      ${row('Signed up', safe.signupAt)}
      ${row('Plan', safe.plan)}
      ${row('Subscription status', safe.subscriptionStatus)}
      ${row('Trial ends', safe.trialEndsAt)}
      ${row('Stripe customer', safe.stripeCustomerId)}
      ${row('Stripe subscription', safe.stripeSubscriptionId)}
    </table>
    <p style="margin:0 0 6px;">
      <a href="${safe.campgroundUrl}" style="color:#f59e0b; text-decoration:underline;">View their public campground page →</a>
    </p>
    <p style="margin:0;">
      <a href="${safe.adminCampgroundsUrl}" style="color:#f59e0b; text-decoration:underline;">Open admin · campgrounds →</a>
    </p>
  `

  const html = buildBrandedHtml({
    preheader: `New trial: ${args.campgroundName} (${args.ownerEmail})`,
    eyebrow: 'New campground trial',
    headline: 'A new owner just started a trial',
    bodyHtml,
    cta: { label: 'Open admin · campgrounds', url: args.adminCampgroundsUrl },
    secondaryNote:
      'This is an internal RoadWave alert. To stop these, unset the INTERNAL_NEW_OWNER_NOTIFY_EMAIL env var in Vercel.',
    recipient: recipients.join(', '),
  })

  const text = `New campground trial on RoadWave

Campground:          ${args.campgroundName}
Slug:                ${args.campgroundSlug}
Owner name:          ${args.ownerName ?? '—'}
Owner email:         ${args.ownerEmail}
Signed up:           ${formatDate(args.signupAt)}
Plan:                ${formatPlan(args.plan)}
Subscription status: ${args.subscriptionStatus}
Trial ends:          ${args.trialEndsAt ? formatDate(args.trialEndsAt) : '—'}
Stripe customer:     ${args.stripeCustomerId ?? '—'}
Stripe subscription: ${args.stripeSubscriptionId ?? '—'}

Public campground page: ${args.campgroundUrl}
Admin campgrounds:      ${args.adminCampgroundsUrl}

Sent to ${recipients.join(', ')} from hello@getroadwave.com.
To stop these alerts, unset INTERNAL_NEW_OWNER_NOTIFY_EMAIL in Vercel.`

  return {
    to: recipients,
    subject: `[RoadWave] New campground trial: ${args.campgroundName}`,
    html,
    text,
  }
}

// Public send wrapper. Renders the alert then ships it through
// sendBrandedEmail. Kept as a thin shim so callers (the Stripe
// webhook handler) only import the send entry point.
export async function sendInternalNewOwnerAlert(
  args: Args,
): Promise<SendResult> {
  const rendered = renderInternalNewOwnerAlert(args)
  return sendBrandedEmail({
    to: rendered.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  })
}

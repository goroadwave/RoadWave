'use server'

import { sendMagicLinkEmail } from '@/lib/email/magic-link'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteOrigin } from '@/lib/utils'
import { headers } from 'next/headers'

// Server action backing the "Email me my dashboard link" button on
// /owners/success. The flow:
//
//   1. Visitor lands on /owners/success after Stripe Checkout with
//      ?session_id=cs_test_… in the URL. The webhook has (or will
//      shortly) provisioned an auth user + campground row + sent the
//      onboarding kit email containing a magic link to the dashboard.
//   2. If that email got lost / hasn't arrived / expired, the visitor
//      hits this action.
//   3. We look up the submission by stripe_session_id, generate a
//      fresh magic link via supabase.auth.admin.generateLink (which
//      mints a token tied to the auth user, NOT the URL parameter),
//      and email it to the email on file.
//
// Security model:
//   - The magic link is only ever emailed to submission.email — the
//     email captured during checkout. The visitor cannot redirect the
//     email to themselves by passing a different value.
//   - The session_id is just a lookup key. The magic link itself is
//     the credential — clicking it requires inbox access.
//   - A Stripe session_id leak would let an attacker spam the
//     legitimate owner's inbox with magic links; it does not let them
//     sign in. We accept that low-impact risk for v1 — a proper rate
//     limit (column-based or Upstash) can be added later if abuse
//     becomes visible.

export type ResendMagicLinkState = {
  ok: boolean
  message: string | null
}

const SESSION_ID_RE = /^cs_(test|live)_[a-zA-Z0-9_-]{10,200}$/

export async function resendOwnerMagicLinkAction(
  _prev: ResendMagicLinkState,
  formData: FormData,
): Promise<ResendMagicLinkState> {
  const sessionId = formData.get('session_id')
  if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) {
    return {
      ok: false,
      message: 'Missing or invalid checkout session. Refresh this page and try again.',
    }
  }

  const admin = createSupabaseAdminClient()
  const { data: submission } = await admin
    .from('owner_signup_submissions')
    .select('id, email, campground_name, status')
    .eq('stripe_session_id', sessionId)
    .maybeSingle<{
      id: string
      email: string
      campground_name: string
      status: string
    }>()

  if (!submission) {
    return {
      ok: false,
      message:
        "We couldn't find that checkout session yet. The webhook may still be running — wait 10 seconds and try again.",
    }
  }

  if (submission.status !== 'provisioned') {
    return {
      ok: false,
      message:
        "Your account isn't ready yet — the webhook is still provisioning it. Try again in 15 seconds, or check your inbox: the onboarding email is usually faster than this button.",
    }
  }

  // Generate the magic link against the auth user that the webhook
  // created. We DON'T email the raw Supabase action_link — Gmail
  // and other gateways pre-fetch links in emails for malware
  // scanning, which consumes the OTP. We email a link to our own
  // /auth/sign-in confirmation page; the OTP is only consumed when
  // the human submits the form on that page. See the page comment
  // at src/app/auth/sign-in/page.tsx for the full rationale.
  const headerList = await headers()
  const origin = getSiteOrigin(headerList)
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: submission.email,
      options: { redirectTo: `${origin}/owner/dashboard` },
    })
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error(
      '[owners/success/resend] generateLink failed:',
      linkError?.message,
    )
    return {
      ok: false,
      message:
        "We couldn't generate a fresh link. Please email hello@getroadwave.com and a real human will get you set up.",
    }
  }

  const params = new URLSearchParams({
    th: linkData.properties.hashed_token,
    email: submission.email,
    next: '/owner/dashboard',
  })
  const magicLinkUrl = `${origin}/auth/sign-in?${params.toString()}`

  const result = await sendMagicLinkEmail({
    toEmail: submission.email,
    magicLinkUrl,
    campgroundName: submission.campground_name,
  })

  if (!result.ok) {
    console.error('[owners/success/resend] email send failed:', result.error)
    return {
      ok: false,
      message:
        "The link was generated but our email service didn't accept it. Email hello@getroadwave.com — we'll get you in.",
    }
  }

  return {
    ok: true,
    message: `Sent. Check ${maskEmail(submission.email)} for a fresh dashboard link.`,
  }
}

// Mask the email so a session_id leak via shared URL doesn't also
// disclose the full email back to the visitor in plain text.
//   "alice@example.com"  →  "a****@example.com"
function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const visible = local.slice(0, 1)
  return `${visible}${'*'.repeat(Math.max(1, local.length - 1))}${domain}`
}

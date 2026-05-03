import { Resend } from 'resend'

// Centralized Resend client. Every transactional email file in
// src/lib/email/ now goes through sendBrandedEmail() — there is no
// raw fetch('https://api.resend.com/emails', ...) anywhere in the app.
//
// Env vars:
//   RESEND_API_KEY       — required for any email to actually send.
//                          When missing, the helper logs and returns
//                          { ok:false, error: 'RESEND_API_KEY not set' }
//                          so dev / preview environments don't crash.
//   RESEND_FROM_EMAIL    — From: header. Defaults to a sane RoadWave
//                          address; set explicitly in production once
//                          the sending domain is verified in Resend.

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'RoadWave <hello@getroadwave.com>'

export type SendResult = { ok: boolean; error: string | null; id?: string }

export type SendArgs = {
  to: string | string[]
  subject: string
  html: string
  text: string
  /** Override the From: header for a specific send (e.g. safety@). */
  from?: string
  /** Reply-To: header. Useful for routing replies to a different inbox. */
  replyTo?: string | string[]
  /** Inline attachments — used by emails that embed a QR PNG. */
  attachments?: {
    filename: string
    /** Base64-encoded content. */
    content: string
    /** content_id for `cid:` references inside the HTML body. */
    contentId?: string
  }[]
}

let cached: Resend | null = null
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!cached) cached = new Resend(key)
  return cached
}

/**
 * Single entry point for every transactional email. Wraps the Resend
 * SDK with the same error-handling shape every email file in the app
 * uses (`{ ok, error }`), and routes through the branded HTML shell
 * via the buildBrandedHtml() helper in templates/base-html.ts.
 */
export async function sendBrandedEmail(args: SendArgs): Promise<SendResult> {
  const client = getClient()
  if (!client) {
    console.warn(
      '[email/resend] RESEND_API_KEY not set — skipping email send.',
    )
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }

  const fromEmail = args.from ?? FROM_EMAIL
  const recipients = Array.isArray(args.to) ? args.to : [args.to]
  console.log(
    `[email/resend] attempting send: subject=${JSON.stringify(args.subject)} from=${JSON.stringify(fromEmail)} to=${JSON.stringify(recipients)}`,
  )

  try {
    const result = await client.emails.send({
      from: fromEmail,
      to: recipients,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
      attachments: args.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        // The Resend SDK accepts content_id under the `contentId` key
        // for inline cid: references.
        contentId: a.contentId,
      })),
    })
    if (result.error) {
      console.error('[email/resend] send rejected:', result.error)
      return { ok: false, error: result.error.message ?? 'Resend rejected' }
    }
    console.log(`[email/resend] send ok id=${result.data?.id ?? 'unknown'}`)
    return { ok: true, error: null, id: result.data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resend send failed'
    console.error('[email/resend] send threw:', msg)
    return { ok: false, error: msg }
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

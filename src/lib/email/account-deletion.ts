// Confirmation email sent right before we tear down the user's account.
// Sender is hello@getroadwave.com (set via RESEND_FROM_EMAIL or fallback).
// We send BEFORE the cascade delete because, once auth.users is gone,
// auth.users.email is too.

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'RoadWave <hello@getroadwave.com>'

export type SendResult = { ok: boolean; error: string | null }

type Args = {
  toEmail: string
  deletedAt: string
}

export async function sendAccountDeletionConfirmEmail(
  args: Args,
): Promise<SendResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('[acct-delete] RESEND_API_KEY not set — skipping email.')
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [args.toEmail],
        subject: 'Your RoadWave account has been deleted',
        html: buildHtml(args),
        text: buildText(args),
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[acct-delete] Resend rejected:', res.status, detail)
      return { ok: false, error: `Resend ${res.status}: ${detail}` }
    }
    return { ok: true, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resend send failed'
    console.error('[acct-delete] send error:', msg)
    return { ok: false, error: msg }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml({ toEmail, deletedAt }: Args): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Account deleted</title></head>
  <body style="margin:0; padding:0; background:#0a0f1c; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0f1c; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background:#0a0f1c;">
          <tr><td align="center" style="padding:8px 0 28px;">
            <span style="font-family:Georgia,serif; font-weight:800; font-size:34px; letter-spacing:-0.02em; line-height:1; white-space:nowrap;">
              <span style="color:#f5ecd9;">Road</span><span style="color:#f59e0b;">Wave</span>
            </span>
          </td></tr>
          <tr><td style="background:#111a2e; border:1px solid rgba(255,255,255,0.06); border-radius:18px; padding:36px 32px;">
            <p style="margin:0 0 6px; color:#f59e0b; font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase;">Account deleted</p>
            <h1 style="margin:0 0 18px; color:#f5ecd9; font-size:28px; font-weight:800; line-height:1.15;">Your data has been deleted.</h1>
            <p style="margin:0 0 16px; color:#cbd3e0; font-size:16px; line-height:1.55;">
              Confirming your RoadWave account and all associated data — profile, check-ins, wave history, crossed paths, and messages — were deleted on ${escapeHtml(deletedAt)}.
            </p>
            <p style="margin:0 0 16px; color:#cbd3e0; font-size:16px; line-height:1.55;">
              We retained a small compliance record (your user id, an email snapshot, and the timestamp) but no profile or activity data.
            </p>
            <p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.55;">
              If you didn&rsquo;t request this deletion, write to
              <a href="mailto:safety@getroadwave.com" style="color:#f59e0b; text-decoration:underline;">safety@getroadwave.com</a>
              right away.
            </p>
            <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:18px 0;" />
            <p style="margin:0; color:#94a3b8; font-size:12px;">
              Questions? Write to <a href="mailto:hello@getroadwave.com" style="color:#f59e0b;">hello@getroadwave.com</a>.
            </p>
          </td></tr>
          <tr><td align="center" style="padding:22px 12px 8px; color:#94a3b8; font-size:12px;">RoadWave — A private way to see campground updates, find shared interests, and say hello only when you want to.</td></tr>
          <tr><td align="center" style="padding:0 12px 8px; color:#64748b; font-size:11px;">Sent to ${escapeHtml(toEmail)} from hello@getroadwave.com.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function buildText({ toEmail, deletedAt }: Args): string {
  return `Your RoadWave account has been deleted.

Confirming your RoadWave account and all associated data — profile, check-ins, wave history, crossed paths, and messages — were deleted on ${deletedAt}.

We retained a small compliance record (your user id, an email snapshot, and the timestamp) but no profile or activity data.

If you didn't request this deletion, write to safety@getroadwave.com right away.

Sent to ${toEmail} from hello@getroadwave.com.`
}

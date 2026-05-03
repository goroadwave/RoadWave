import { sendBrandedEmail, escapeHtml, type SendResult } from '@/lib/email/resend'

// Internal report notification — goes to the safety inbox, not the reporter.
// Intentionally NOT branded with the public RoadWave shell since it's an
// ops alert and the safety team needs the raw fields easy to scan.
//
// For the user-facing "your report was received" confirmation, see
// report-confirmation.ts.

const SAFETY_INBOX = 'safety@getroadwave.com'

export type SafetyArgs = {
  reportId: string
  category: 'low' | 'medium' | 'high'
  description: string
  reporter: { id: string; email: string | null; username: string | null }
  reported: { id: string | null; username: string | null; display_name: string | null }
  campground: { id: string | null; name: string | null }
  createdAt: string
  // Whether the action auto-suspended the reported account.
  suspended: boolean
}

export type { SendResult }

export async function sendReportNotificationEmail(
  args: SafetyArgs,
): Promise<SendResult> {
  return sendBrandedEmail({
    to: SAFETY_INBOX,
    subject: subjectFor(args),
    html: buildHtml(args),
    text: buildText(args),
  })
}

function subjectFor(a: SafetyArgs): string {
  const tag =
    a.category === 'high'
      ? '[HIGH] '
      : a.category === 'medium'
        ? '[medium] '
        : '[low] '
  const target = a.reported.username ? `@${a.reported.username}` : 'a user'
  return `${tag}RoadWave report — ${target}`
}

function buildHtml(a: SafetyArgs): string {
  const banner =
    a.category === 'high'
      ? `<p style="background:#7f1d1d; color:#fee2e2; padding:10px 14px; border-radius:8px; font-weight:700; margin:0 0 16px;">HIGH severity — auto-suspension ${a.suspended ? 'applied' : 'NOT APPLIED (no reported user id on record)'}.</p>`
      : ''
  const row = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0; color:#94a3b8; vertical-align:top;">${k}</td><td style="padding:4px 0; color:#f5ecd9;">${v}</td></tr>`
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; background:#0a0f1c; color:#f5ecd9; padding:24px; margin:0;">
  <table style="max-width:560px; margin:0 auto;">
    <tr><td>
      <p style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#f59e0b; font-weight:700; margin:0 0 6px;">Trust &amp; Safety</p>
      <h1 style="font-size:22px; font-weight:800; color:#f5ecd9; margin:0 0 14px;">New report — ${escapeHtml(a.category)}</h1>
      ${banner}
      <table style="border-collapse:collapse;">
        ${row('Report ID', escapeHtml(a.reportId))}
        ${row('Created', escapeHtml(a.createdAt))}
        ${row('Category', escapeHtml(a.category))}
        ${row('Campground', a.campground.name ? `${escapeHtml(a.campground.name)} (${escapeHtml(a.campground.id ?? '')})` : '<span style="color:#64748b;">none</span>')}
        ${row('Reporter', `${escapeHtml(a.reporter.username ?? '(no username)')} · ${escapeHtml(a.reporter.email ?? '(no email)')} · ${escapeHtml(a.reporter.id)}`)}
        ${row('Reported user', a.reported.id ? `${escapeHtml(a.reported.display_name ?? '')} @${escapeHtml(a.reported.username ?? '(no username)')} · ${escapeHtml(a.reported.id)}` : '<span style="color:#64748b;">no user id captured</span>')}
        ${row('Auto-suspended', a.suspended ? 'yes' : 'no')}
      </table>
      <h2 style="font-size:14px; font-weight:700; color:#f5ecd9; margin:18px 0 6px;">Description</h2>
      <pre style="white-space:pre-wrap; word-break:break-word; background:#111a2e; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px; margin:0; font-family:inherit; font-size:14px; color:#cbd3e0;">${escapeHtml(a.description)}</pre>
      <p style="color:#94a3b8; font-size:12px; margin:18px 0 0;">Action this report in Supabase → public.reports row ${escapeHtml(a.reportId)}.</p>
    </td></tr>
  </table>
</body></html>`
}

function buildText(a: SafetyArgs): string {
  return [
    `RoadWave report — ${a.category}`,
    a.category === 'high'
      ? `HIGH severity — auto-suspension ${a.suspended ? 'applied' : 'NOT APPLIED'}.`
      : '',
    '',
    `Report ID: ${a.reportId}`,
    `Created: ${a.createdAt}`,
    `Category: ${a.category}`,
    `Campground: ${a.campground.name ?? '(none)'} ${a.campground.id ?? ''}`,
    `Reporter: ${a.reporter.username ?? '(no username)'} ${a.reporter.email ?? ''} ${a.reporter.id}`,
    `Reported: ${a.reported.id ? `@${a.reported.username ?? ''} ${a.reported.id}` : '(no user id)'}`,
    `Auto-suspended: ${a.suspended ? 'yes' : 'no'}`,
    '',
    'Description:',
    a.description,
  ]
    .filter(Boolean)
    .join('\n')
}

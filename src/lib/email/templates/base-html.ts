import { escapeHtml } from '@/lib/email/resend'

// RoadWave branded HTML shell for every transactional email. Dark navy
// background, amber accents, RoadWave logo at the top, single
// content card, footer with the tagline + recipient line. Body content
// is composed by each email file and passed in as raw HTML.
//
// Email-client gotchas baked in:
//   - All layout uses <table> + inline styles (Outlook, Gmail mobile).
//   - max-width:560px keeps things readable on phone.
//   - Color hex values are repeated inline (no CSS vars — Outlook
//     strips them).
//   - <hr style="..."/> uses a 1px top border, since Outlook ignores
//     border:none on hr.

const PALETTE = {
  night: '#0a0f1c',
  card: '#111a2e',
  cardBorder: 'rgba(255,255,255,0.06)',
  cream: '#f5ecd9',
  flame: '#f59e0b',
  flameDark: '#0a0f1c',
  body: '#cbd3e0',
  mist: '#94a3b8',
  mistDim: '#64748b',
}

export type BrandedEmailParts = {
  /** Tiny preheader text shown in inbox previews. */
  preheader?: string
  /** Top-of-card eyebrow text (small uppercase amber). */
  eyebrow: string
  /** H1 inside the card. */
  headline: string
  /** Card body — raw HTML composed by the email file. */
  bodyHtml: string
  /** Optional CTA button rendered after the body. */
  cta?: { label: string; url: string }
  /** Optional footer line beneath the standard tagline. Useful for
   *  the recipient address ("Sent to user@…"). */
  recipient?: string
  /** Optional secondary-color note rendered inside the card after the
   *  body but before the CTA — e.g. "Reply to this email…" line. */
  secondaryNote?: string
}

/**
 * Compose a fully-branded RoadWave HTML email. Pure function; no I/O.
 */
export function buildBrandedHtml(parts: BrandedEmailParts): string {
  const preheader = parts.preheader ? escapeHtml(parts.preheader) : ''
  const eyebrow = escapeHtml(parts.eyebrow)
  const headline = escapeHtml(parts.headline)
  const recipient = parts.recipient ? escapeHtml(parts.recipient) : null

  const ctaBlock = parts.cta
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">
              <tr>
                <td align="center" bgcolor="${PALETTE.flame}" style="border-radius:12px;">
                  <a href="${escapeHtml(parts.cta.url)}" target="_blank" rel="noopener" style="display:inline-block; padding:14px 26px; font-size:15px; font-weight:700; color:${PALETTE.flameDark}; text-decoration:none; border-radius:12px; background:${PALETTE.flame};">${escapeHtml(parts.cta.label)}</a>
                </td>
              </tr>
            </table>`
    : ''

  const secondaryNote = parts.secondaryNote
    ? `
            <hr style="border:none; border-top:1px solid rgba(255,255,255,0.08); margin:18px 0;" />
            <p style="margin:0; color:${PALETTE.mist}; font-size:12px; line-height:1.5;">${parts.secondaryNote}</p>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${headline}</title>
  </head>
  <body style="margin:0; padding:0; background:${PALETTE.night}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color:${PALETTE.cream};">
    ${preheader ? `<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PALETTE.night}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background:${PALETTE.night};">
            <tr>
              <td align="center" style="padding:8px 0 28px;">
                <span style="font-family:Georgia,serif; font-weight:800; font-size:34px; letter-spacing:-0.02em; line-height:1; white-space:nowrap;">
                  <span style="color:${PALETTE.cream};">Road</span><span style="color:${PALETTE.flame};">Wave</span>
                  <span style="font-size:32px;" aria-hidden="true">👋</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="background:${PALETTE.card}; border:1px solid ${PALETTE.cardBorder}; border-radius:18px; padding:36px 32px;">
                <p style="margin:0 0 6px; color:${PALETTE.flame}; font-size:11px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase;">${eyebrow}</p>
                <h1 style="margin:0 0 18px; color:${PALETTE.cream}; font-size:28px; font-weight:800; line-height:1.15;">${headline}</h1>
                <div style="color:${PALETTE.body}; font-size:16px; line-height:1.55;">${parts.bodyHtml}</div>
                ${ctaBlock}
                ${secondaryNote}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 12px 8px; color:${PALETTE.mist}; font-size:12px; line-height:1.5;">
                RoadWave — A private way to see campground updates, find shared interests, and say hello only when you want to.
              </td>
            </tr>
            ${
              recipient
                ? `<tr>
              <td align="center" style="padding:0 12px 8px; color:${PALETTE.mistDim}; font-size:11px; line-height:1.5;">
                Sent to ${recipient} from hello@getroadwave.com.
              </td>
            </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

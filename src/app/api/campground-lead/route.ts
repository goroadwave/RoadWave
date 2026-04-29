import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getRequestIp } from '@/lib/utils'

const NOTIFY_TO = 'hello@getroadwave.com'
// Resend's onboarding sender works without domain verification but only
// emails the account's own verified address. Override with RESEND_FROM_EMAIL
// once you've verified getroadwave.com (recommended) — e.g.
//   RESEND_FROM_EMAIL='RoadWave <demos@getroadwave.com>'
const DEFAULT_FROM = 'RoadWave <onboarding@resend.dev>'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let payload: {
    name?: unknown
    campground?: unknown
    email?: unknown
  }
  try {
    payload = await request.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const campgroundName =
    typeof payload.campground === 'string' ? payload.campground.trim() : ''
  const email = typeof payload.email === 'string' ? payload.email.trim() : ''

  if (!name || !campgroundName || !email) {
    return new NextResponse('Missing required fields.', { status: 400 })
  }
  if (name.length > 200 || campgroundName.length > 200 || email.length > 320) {
    return new NextResponse('One of those is way too long.', { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return new NextResponse('Enter a valid email.', { status: 400 })
  }

  const ip = getRequestIp(request.headers)
  const userAgent = request.headers.get('user-agent')

  // 1. Persist to Supabase. Don't block on a DB failure — we still want
  // the email to go out so the lead doesn't slip through.
  const admin = createSupabaseAdminClient()
  const { error: dbError } = await admin.from('campground_leads').insert({
    name,
    campground_name: campgroundName,
    email,
    ip_address: ip,
    user_agent: userAgent,
  })
  if (dbError) {
    console.error('campground_leads insert failed:', dbError.message)
  }

  // 2. Email notification via Resend.
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [NOTIFY_TO],
          // Replying in your inbox goes straight back to the prospect.
          reply_to: email,
          subject: `New RoadWave demo request — ${campgroundName}`,
          html: buildHtml({ name, campgroundName, email }),
          text: buildText({ name, campgroundName, email }),
        }),
      })
      if (!resendRes.ok) {
        const detail = await resendRes.text().catch(() => '')
        console.error('Resend send failed:', resendRes.status, detail)
      }
    } catch (err) {
      console.error('Resend send error:', err)
    }
  } else {
    console.warn('RESEND_API_KEY not set — skipping email notification.')
  }

  return NextResponse.json({ ok: true })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml({
  name,
  campgroundName,
  email,
}: {
  name: string
  campgroundName: string
  email: string
}): string {
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, system-ui, sans-serif; background:#0a0f1c; color:#f5ecd9; padding:24px; margin:0;">
    <table style="max-width:520px; margin:0 auto; border-collapse:collapse;">
      <tr><td>
        <p style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#f59e0b; margin:0 0 8px;">New campground demo request</p>
        <h2 style="font-size:22px; font-weight:800; color:#f5ecd9; margin:0 0 4px;">${escapeHtml(campgroundName)}</h2>
        <p style="font-style:italic; color:#f59e0b; margin:0 0 20px;">A new lead just landed.</p>
        <table style="border-collapse:collapse; width:100%; background:#131a2e; border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:12px;">
          <tr>
            <td style="padding:6px 12px 6px 0; color:#94a3b8; font-size:13px; width:130px;">Owner name</td>
            <td style="padding:6px 0; color:#f5ecd9; font-weight:600;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0; color:#94a3b8; font-size:13px;">Campground</td>
            <td style="padding:6px 0; color:#f5ecd9; font-weight:600;">${escapeHtml(campgroundName)}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px 6px 0; color:#94a3b8; font-size:13px;">Email</td>
            <td style="padding:6px 0;"><a style="color:#f59e0b; text-decoration:none;" href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
          </tr>
        </table>
        <p style="color:#94a3b8; font-size:12px; margin:24px 0 0;">Submitted ${new Date().toUTCString()} · Reply to this email to respond directly.</p>
      </td></tr>
    </table>
  </body>
</html>`
}

function buildText({
  name,
  campgroundName,
  email,
}: {
  name: string
  campgroundName: string
  email: string
}): string {
  return `New RoadWave demo request

Owner name: ${name}
Campground:  ${campgroundName}
Email:       ${email}

Submitted ${new Date().toUTCString()}
Reply to this email to respond directly to the prospect.`
}

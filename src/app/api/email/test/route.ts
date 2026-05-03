import { NextResponse, type NextRequest } from 'next/server'
import { sendBrandedEmail } from '@/lib/email/resend'
import { buildBrandedHtml } from '@/lib/email/templates/base-html'
import { requireAdmin } from '@/lib/admin/guard'

// Send a branded test email to a specified address so deliverability
// can be smoke-tested without leaning on the real auth/onboarding
// flows. Admin-gated — non-admins are redirected by requireAdmin().
//
// Usage:
//   POST /api/email/test            { "to": "you@example.com" }
//   GET  /api/email/test?to=you@example.com
//
// Returns:
//   200 { ok: true, id: <resend-id> } on success
//   500 { ok: false, error: <msg> }   on send failure
//   400 { ok: false, error: <msg> }   on missing / malformed payload

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function bodyHtml(): string {
  return `
    <p style="margin:0 0 16px;">
      This is a test email from RoadWave. If you&rsquo;re reading it,
      Resend delivery is working from this environment.
    </p>
    <p style="margin:0; color:#94a3b8; font-size:13px;">
      Sent at <strong style="color:#f5ecd9;">${new Date().toISOString()}</strong>.
    </p>
  `
}

async function handle(to: string | null): Promise<NextResponse> {
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json(
      { ok: false, error: 'Provide a valid `to` email.' },
      { status: 400 },
    )
  }

  const html = buildBrandedHtml({
    preheader: 'RoadWave delivery test.',
    eyebrow: 'Resend smoke test',
    headline: 'Delivery looks good',
    bodyHtml: bodyHtml(),
    secondaryNote: 'No action required. This email is sent on demand from /api/email/test.',
    recipient: to,
  })

  const result = await sendBrandedEmail({
    to,
    subject: 'RoadWave email test 👋',
    html,
    text: `RoadWave email test\n\nThis is a test email from RoadWave. If you're reading it, Resend delivery is working from this environment.\n\nSent at ${new Date().toISOString()}.`,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true, id: result.id })
}

export async function GET(request: NextRequest) {
  await requireAdmin()
  return handle(request.nextUrl.searchParams.get('to'))
}

export async function POST(request: NextRequest) {
  await requireAdmin()
  let to: string | null = null
  try {
    const body = (await request.json()) as { to?: string } | null
    to = body?.to ?? null
  } catch {
    // fall through to error path
  }
  return handle(to)
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { describeOwnerPage } from '@/lib/support/system-prompts'
import { sendBrandedEmail } from '@/lib/email/resend'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST /api/support-chat/report
//
// Sends the current chat transcript to support@getroadwave.com so the
// RoadWave team can pick up where the AI left off. The "Report …"
// button in the support widget triggers this after 3 unresolved
// exchanges (or whenever the user explicitly taps it).
//
// Subject lines:
//   guest → "Guest Support Issue"
//   owner → "Owner Dashboard Bug — <Campground Name> — <Page>"

const reportSchema = z.object({
  audience: z.enum(['guest', 'owner']),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000),
      }),
    )
    .min(1)
    .max(60),
  pathname: z.string().optional(),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = reportSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const { audience, messages, pathname } = parsed.data

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Resolve campground name for owner reports (best-effort — admin
  // client because campgrounds RLS is restrictive on some columns).
  let campgroundName: string | null = null
  if (audience === 'owner') {
    const admin = createSupabaseAdminClient()
    const { data: link } = await admin
      .from('campground_admins')
      .select('campground_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (link) {
      const { data: cg } = await admin
        .from('campgrounds')
        .select('name')
        .eq('id', link.campground_id)
        .single()
      campgroundName = cg?.name ?? null
    }
  }

  const subject =
    audience === 'owner'
      ? `Owner Dashboard Bug — ${campgroundName ?? 'Unknown'} — ${describeOwnerPage(pathname ?? '/owner/dashboard')}`
      : 'Guest Support Issue'

  // Plain-text body — easy to skim in any mail client.
  const meta = [
    `Audience: ${audience}`,
    `User: ${user.email ?? '(no email on auth.users row)'}`,
    pathname ? `Page: ${pathname}` : null,
    campgroundName ? `Campground: ${campgroundName}` : null,
    `Reported at: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n')

  const transcript = messages
    .map(
      (m) =>
        `${m.role === 'user' ? 'GUEST' : 'AI'}: ${m.content.replace(/\r?\n/g, '\n  ')}`,
    )
    .join('\n\n')

  const text = `${meta}\n\n--- Conversation ---\n\n${transcript}\n`

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;font-size:14px;line-height:1.55;">
  <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">${escape(subject)}</h2>
  <pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#111827;border:1px solid #e5e7eb;">${escape(text)}</pre>
  <p style="color:#6b7280;font-size:12px;margin:14px 0 0;">Reply to this email to respond directly to the user.</p>
</div>`

  const result = await sendBrandedEmail({
    to: 'support@getroadwave.com',
    subject,
    html,
    text,
    replyTo: user.email ?? undefined,
  })

  if (!result.ok) {
    console.error('[support-chat/report] send failed:', result.error)
    return NextResponse.json(
      { error: result.error ?? 'Send failed.' },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true })
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

import { NextResponse, type NextRequest } from 'next/server'
import { sendTrialExpiringEmail } from '@/lib/email/trial-expiring'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Daily Vercel cron at 09:00 UTC (configured in vercel.json). Finds
// every campground whose trial_ends_at lands roughly four days from
// today and sends the trial-expiring email.
//
// Idempotency: a 1-day window centered on (now + 4 days) means each
// trial row hits the window on exactly one cron run. We don't track
// "already sent" in the database — adding a column for it is out of
// scope for this batch (the spec said "don't modify existing tables
// beyond the slug field"). Tradeoff: if Vercel cron retries the same
// day, an owner could receive a duplicate trial-expiring email. That's
// preferable to silent failure here.
//
// Auth: gated on a CRON_SECRET header. Vercel cron sets the
// `Authorization: Bearer <secret>` header automatically when
// CRON_SECRET is configured in Vercel env vars.

export const dynamic = 'force-dynamic'

const WINDOW_DAYS_AHEAD = 4

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = request.headers.get('authorization') ?? ''
    if (header !== `Bearer ${secret}`) return unauthorized()
  }

  const admin = createSupabaseAdminClient()

  const now = new Date()
  const windowStart = new Date(
    now.getTime() + (WINDOW_DAYS_AHEAD - 0.5) * 86400_000,
  )
  const windowEnd = new Date(
    now.getTime() + (WINDOW_DAYS_AHEAD + 0.5) * 86400_000,
  )

  type Row = {
    id: string
    name: string
    owner_email: string | null
    trial_ends_at: string
    subscription_status: string
  }

  const { data, error } = await admin
    .from('campgrounds')
    .select('id, name, owner_email, trial_ends_at, subscription_status')
    .gte('trial_ends_at', windowStart.toISOString())
    .lte('trial_ends_at', windowEnd.toISOString())
    .eq('subscription_status', 'trial')
    .returns<Row[]>()

  if (error) {
    console.error('[cron/trial-expiring] supabase select error:', error.message)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    )
  }

  // Build the billing URL from NEXT_PUBLIC_SITE_URL with a hardcoded
  // production fallback. getSiteOrigin() reads request headers, which
  // is correct for user-driven traffic but wrong for Vercel cron — the
  // cron infrastructure forwards an internal host, not the public
  // domain, so the link would land on the wrong origin. Same pattern
  // as the owner-weekly-report route and profile/actions.ts.
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  ).replace(/\/$/, '')
  const billingUrl = `${siteUrl}/owner/billing`

  let sent = 0
  let skipped = 0
  let failed = 0
  for (const row of data ?? []) {
    if (!row.owner_email) {
      skipped += 1
      continue
    }

    const trialEnd = new Date(row.trial_ends_at)
    const days = Math.max(
      0,
      Math.round((trialEnd.getTime() - now.getTime()) / 86400_000),
    )

    const result = await sendTrialExpiringEmail({
      toEmail: row.owner_email,
      ownerName: null,
      campgroundName: row.name,
      trialEndsAt: trialEnd.toUTCString(),
      billingUrl,
      daysRemaining: days,
    })
    if (!result.ok) {
      failed += 1
      console.error(
        `[cron/trial-expiring] send failed for ${row.id}: ${result.error}`,
      )
      continue
    }
    sent += 1
  }

  return NextResponse.json({
    ok: true,
    examined: data?.length ?? 0,
    sent,
    skipped,
    failed,
  })
}

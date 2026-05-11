import { NextResponse, type NextRequest } from 'next/server'
import { sendOwnerWeeklyReportEmail } from '@/lib/email/owner-weekly-report'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Weekly Monday-morning owner report. Vercel cron hits this every
// Monday at 13:00 UTC (configured in vercel.json — that's ~9 AM ET /
// 6 AM PT, the spec's "Monday morning" window).
//
// For each active campground with a non-null owner_email we tally the
// past 7 days across:
//   - QR scans              (campground_events.event_type = 'qr_scan')
//   - Guest check-ins       (check_ins.checked_in_at >= cutoff,
//                             filtered to visible + not suspended,
//                             same shape as 0019's owner_checkin_counts)
//   - Review link clicks    (campground_events review_click)
//   - Book Again clicks     (campground_events book_again_click)
//   - Contact messages      (campground_events contact_message)
//   - Bulletin views        (campground_events bulletin_view)
//
// We send even when every stat is zero — the spec calls for keeping
// owners aware of the cadence. Idempotency: we update
// weekly_report_email_sent_at on success and skip any campground whose
// last-sent stamp lands within the past 6 days (handles Vercel cron
// retries without double-sending).
//
// Auth: Authorization: Bearer ${CRON_SECRET} header — Vercel sends this
// automatically when CRON_SECRET is configured in env vars.

export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 7
// Suppression window — slightly shorter than 7 days so a retry on
// Monday afternoon doesn't double-send, but a normal Mon-to-next-Mon
// schedule is never blocked.
const MIN_DAYS_BETWEEN_SENDS = 6

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

type CampgroundRow = {
  id: string
  name: string
  owner_email: string | null
  is_active: boolean
  weekly_report_email_sent_at: string | null
}

type WeeklyStatsRow = {
  qr_scans: number
  check_ins: number
  review_clicks: number
  book_again_clicks: number
  contact_messages: number
  bulletin_views: number
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = request.headers.get('authorization') ?? ''
    if (header !== `Bearer ${secret}`) return unauthorized()
  }

  const admin = createSupabaseAdminClient()
  const now = new Date()
  const cutoff = new Date(now.getTime() - WINDOW_DAYS * 86400_000)
  const suppressionCutoff = new Date(
    now.getTime() - MIN_DAYS_BETWEEN_SENDS * 86400_000,
  ).toISOString()

  // Owners eligible for this run. We pull is_active=true and an
  // owner_email present; we filter the suppression window in code
  // (cleaner than .or() against null).
  const { data: campgrounds, error: cgError } = await admin
    .from('campgrounds')
    .select(
      'id, name, owner_email, is_active, weekly_report_email_sent_at',
    )
    .eq('is_active', true)
    .not('owner_email', 'is', null)
    .returns<CampgroundRow[]>()

  if (cgError) {
    console.error(
      '[cron/owner-weekly-report] campground select failed:',
      cgError.message,
    )
    return NextResponse.json(
      { ok: false, error: cgError.message },
      { status: 500 },
    )
  }

  // Build the dashboard URL from NEXT_PUBLIC_SITE_URL (set in Vercel)
  // with a hardcoded production fallback. getSiteOrigin() reads the
  // request headers, which is the right call for user-driven requests
  // but the wrong call for Vercel cron — the cron infrastructure
  // forwards an internal host (vercel.com / a Vercel deploy URL),
  // not the public domain, so the link would land on the wrong host.
  // Same fallback pattern used in profile/actions.ts and the dashboard.
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'
  ).replace(/\/$/, '')
  const dashboardUrl = `${siteUrl}/owner/dashboard`
  const windowLabel = formatWindowLabel(cutoff, now)

  let sent = 0
  let skipped = 0
  let failed = 0
  for (const cg of campgrounds ?? []) {
    if (!cg.owner_email) {
      skipped += 1
      continue
    }
    if (
      cg.weekly_report_email_sent_at &&
      cg.weekly_report_email_sent_at > suppressionCutoff
    ) {
      skipped += 1
      continue
    }

    // Six counts over the trailing 7 days, computed in a single SQL
    // round-trip by the SECURITY DEFINER RPC. The cron variant of the
    // RPC skips the campground_admins auth guard (admin client has no
    // user context) and is grant-locked to service_role only.
    const { data: statsRow, error: statsError } = await admin
      .rpc('owner_weekly_stats_for_cron', { _campground_id: cg.id })
      .maybeSingle<WeeklyStatsRow>()
    if (statsError) {
      failed += 1
      console.error(
        `[cron/owner-weekly-report] stats RPC failed for ${cg.id}: ${statsError.message}`,
      )
      continue
    }
    const stats = {
      qrScans: statsRow?.qr_scans ?? 0,
      checkIns: statsRow?.check_ins ?? 0,
      reviewClicks: statsRow?.review_clicks ?? 0,
      bookAgainClicks: statsRow?.book_again_clicks ?? 0,
      contactMessages: statsRow?.contact_messages ?? 0,
      bulletinViews: statsRow?.bulletin_views ?? 0,
    }

    // Owner display name (best-effort — only used in the greeting line).
    // Same two-step pattern as sendOwnerWelcomeEmail in profile/actions.ts.
    let ownerName: string | null = null
    const { data: ownerLink } = await admin
      .from('campground_admins')
      .select('user_id')
      .eq('campground_id', cg.id)
      .eq('role', 'owner')
      .maybeSingle()
    if (ownerLink?.user_id) {
      const { data: prof } = await admin
        .from('profiles')
        .select('display_name')
        .eq('id', ownerLink.user_id)
        .maybeSingle()
      ownerName = prof?.display_name ?? null
    }

    const result = await sendOwnerWeeklyReportEmail({
      toEmail: cg.owner_email,
      ownerName,
      campgroundName: cg.name,
      stats,
      dashboardUrl,
      windowLabel,
    })

    if (!result.ok) {
      failed += 1
      console.error(
        `[cron/owner-weekly-report] send failed for ${cg.id}: ${result.error}`,
      )
      continue
    }

    sent += 1
    await admin
      .from('campgrounds')
      .update({ weekly_report_email_sent_at: now.toISOString() })
      .eq('id', cg.id)
  }

  return NextResponse.json({
    ok: true,
    examined: campgrounds?.length ?? 0,
    sent,
    skipped,
    failed,
  })
}

function formatWindowLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  return `${fmt(start)} – ${fmt(end)}, ${end.getUTCFullYear()}`
}

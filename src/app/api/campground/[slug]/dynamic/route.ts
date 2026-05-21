import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Phase 3a polling endpoint.
//
// Returns the dynamic / time-sensitive slice of a campground's QR
// page state: active bulletins + upcoming meetups. The camper QR
// page client islands hit this every ~60s while the tab is visible
// to refresh the announcement and meetup lists without a full route
// reload. Stable surfaces (logo, name, map, Wi-Fi, amenities, rules,
// support links, contact form, persistent message tracker) are
// intentionally NOT in this payload -- they live in the SSR render
// path and never need to refresh between renders.
//
// Shape mirrors the SSR fetch in /campground/[slug]/page.tsx so the
// client islands can hot-swap their state with no flicker:
//   {
//     bulletins: GuestHubBulletin[],
//     meetups: GuestHubMeetup[],
//     critical: CriticalBulletin | null,   -- Phase 3c
//   }
//
// Phase 3c -- the `critical` slot holds the most recent active
// is_critical=true bulletin for the campground, or null. The camper
// QR page pins this above the welcome header with strong red
// styling; the Lantern counts it as a distinct item type. Older
// criticals (still active but not the most recent) stay in the
// regular bulletins list with their existing styling.
//
// Caching: explicit no-store. Each poll must hit the database; a CDN
// or browser cache hit would defeat the freshness goal.
//
// RLS: bulletins + meetups already have public-read policies for
// active rows (mig 0009). We use the admin client for parity with
// the SSR path so result shape stays identical.

type BulletinRow = {
  id: string
  message: string
  category: 'event' | 'special' | 'alert' | 'general'
  expires_at: string | null
  created_at: string
}

type CriticalBulletinRow = {
  id: string
  message: string
  expires_at: string | null
  created_at: string
}

type MeetupRow = {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
}

const LIST_CAP = 30

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (typeof slug !== 'string' || slug.length === 0) {
    return NextResponse.json({ ok: false, error: 'Bad slug' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  // Resolve slug -> campground id. 404 distinguishes "this URL is
  // wrong" from "the campground has no announcements".
  const { data: cg } = await admin
    .from('campgrounds')
    .select('id, is_active')
    .eq('slug', slug)
    .maybeSingle<{ id: string; is_active: boolean }>()
  if (!cg || !cg.is_active) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const [
    { data: bulletins },
    { data: meetups },
    { data: criticalRows },
  ] = await Promise.all([
    admin
      .from('bulletins')
      .select('id, message, category, expires_at, created_at')
      .eq('campground_id', cg.id)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(LIST_CAP)
      .returns<BulletinRow[]>(),
    admin
      .from('meetups')
      .select('id, title, description, location, start_at, end_at')
      .eq('campground_id', cg.id)
      .gte('start_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(LIST_CAP)
      .returns<MeetupRow[]>(),
    // Phase 3c -- the most recent active is_critical bulletin. Backed
    // by the bulletins_critical_idx partial index from mig 0058 so
    // this is a cheap lookup even on campgrounds with many rows.
    admin
      .from('bulletins')
      .select('id, message, expires_at, created_at')
      .eq('campground_id', cg.id)
      .eq('is_critical', true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<CriticalBulletinRow[]>(),
  ])

  const critical =
    Array.isArray(criticalRows) && criticalRows.length > 0
      ? criticalRows[0]
      : null

  // TEMP DEBUG -- remove after meetup-visibility regression
  // resolved. Logs the meetups query result so we can confirm in
  // Vercel logs whether saved meetups are being returned, and what
  // nowIso the filter is using (in case a timezone issue is making
  // a future-looking meetup look expired UTC-wise).
  console.log('[debug-meetup-read]', {
    slug,
    campgroundId: cg.id,
    nowIso,
    bulletinsCount: bulletins?.length ?? 0,
    meetupsCount: meetups?.length ?? 0,
    firstMeetup: meetups && meetups.length > 0 ? meetups[0] : null,
  })

  return NextResponse.json(
    {
      ok: true,
      bulletins: bulletins ?? [],
      meetups: meetups ?? [],
      critical,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

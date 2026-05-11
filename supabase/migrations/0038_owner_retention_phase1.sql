-- ============================================================================
-- 0038_owner_retention_phase1.sql
-- Phase 1 of the owner retention features:
--
--   1. Per-campground Review URL + Book Again URL on the campgrounds row.
--      Owners configure these on /owner/profile. The welcome page renders
--      a CTA for each that is set.
--
--   2. campground_events — append-only log of guest-side activity that
--      doesn't already have a dedicated table. QR scans, review clicks,
--      book-again clicks, contact messages, bulletin views. Rolled up
--      into the dashboard "This Week" card and the Monday weekly report
--      email. RLS locked down to service-role only (no policies) — every
--      write goes through /api/campground/event with service-role.
--
--   3. owner_weekly_stats(_campground_id uuid) — SECURITY DEFINER RPC
--      that returns the six counts (scans, check-ins, review clicks,
--      book again clicks, contact messages, bulletin views) over the
--      past 7 days. Guarded by a campground_admins membership check on
--      the calling user so non-admins get zeros. Mirrors the shape of
--      0019's owner_checkin_counts.
--
--   4. weekly_report_email_sent_at — last-sent stamp so the Monday cron
--      doesn't double-send if Vercel retries.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Owner-configured external links on the campgrounds row.
-- ----------------------------------------------------------------------------
alter table public.campgrounds
  add column if not exists google_review_url text,
  add column if not exists booking_url text,
  add column if not exists weekly_report_email_sent_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2. campground_events — append-only activity log.
-- ----------------------------------------------------------------------------
create table if not exists public.campground_events (
  id uuid primary key default gen_random_uuid(),
  campground_id uuid not null references public.campgrounds(id) on delete cascade,
  event_type text not null check (event_type in (
    'qr_scan',
    'review_click',
    'book_again_click',
    'contact_message',
    'bulletin_view'
  )),
  occurred_at timestamptz not null default now(),
  request_ip text,
  metadata jsonb
);

create index if not exists campground_events_campground_idx
  on public.campground_events (campground_id, event_type, occurred_at desc);
create index if not exists campground_events_occurred_idx
  on public.campground_events (occurred_at desc);

-- RLS enabled, no policies = service-role-only access.
alter table public.campground_events enable row level security;

-- ----------------------------------------------------------------------------
-- 3. owner_weekly_stats — six counts over the trailing 7 days.
-- ----------------------------------------------------------------------------
-- Returns one row with the six metrics. check_ins is read separately from
-- the same privacy rules as 0019's owner_checkin_counts (visible + not
-- suspended). The five campground_events metrics are unfiltered counts
-- of the corresponding rows from the trailing 7 days.
create or replace function public.owner_weekly_stats(_campground_id uuid)
returns table(
  qr_scans int,
  check_ins int,
  review_clicks int,
  book_again_clicks int,
  contact_messages int,
  bulletin_views int
)
language sql
stable
security definer
set search_path = public
as $$
  with admin as (
    select 1
      from public.campground_admins ca
     where ca.campground_id = _campground_id
       and ca.user_id = auth.uid()
  ),
  cutoff as (
    select now() - interval '7 days' as since
  )
  select
    coalesce((
      select count(*)::int
        from public.campground_events e, cutoff c
       where e.campground_id = _campground_id
         and e.event_type = 'qr_scan'
         and e.occurred_at >= c.since
         and exists (select 1 from admin)
    ), 0) as qr_scans,
    coalesce((
      select count(*)::int
        from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id,
        cutoff c
       where ci.campground_id = _campground_id
         and ci.checked_in_at >= c.since
         and p.privacy_mode = 'visible'
         and p.suspended_at is null
         and exists (select 1 from admin)
    ), 0) as check_ins,
    coalesce((
      select count(*)::int
        from public.campground_events e, cutoff c
       where e.campground_id = _campground_id
         and e.event_type = 'review_click'
         and e.occurred_at >= c.since
         and exists (select 1 from admin)
    ), 0) as review_clicks,
    coalesce((
      select count(*)::int
        from public.campground_events e, cutoff c
       where e.campground_id = _campground_id
         and e.event_type = 'book_again_click'
         and e.occurred_at >= c.since
         and exists (select 1 from admin)
    ), 0) as book_again_clicks,
    coalesce((
      select count(*)::int
        from public.campground_events e, cutoff c
       where e.campground_id = _campground_id
         and e.event_type = 'contact_message'
         and e.occurred_at >= c.since
         and exists (select 1 from admin)
    ), 0) as contact_messages,
    coalesce((
      select count(*)::int
        from public.campground_events e, cutoff c
       where e.campground_id = _campground_id
         and e.event_type = 'bulletin_view'
         and e.occurred_at >= c.since
         and exists (select 1 from admin)
    ), 0) as bulletin_views;
$$;

revoke all on function public.owner_weekly_stats(uuid) from public;
grant execute on function public.owner_weekly_stats(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. owner_weekly_stats_for_cron — same six counts, no auth guard.
-- ----------------------------------------------------------------------------
-- Used by /api/cron/owner-weekly-report, which runs with the service_role
-- key and has no user context (auth.uid() is null), so the guarded RPC
-- above would always return zero. Locked down via grants — only the
-- service_role can execute it.
create or replace function public.owner_weekly_stats_for_cron(_campground_id uuid)
returns table(
  qr_scans int,
  check_ins int,
  review_clicks int,
  book_again_clicks int,
  contact_messages int,
  bulletin_views int
)
language sql
stable
security definer
set search_path = public
as $$
  with cutoff as (
    select now() - interval '7 days' as since
  )
  select
    (select count(*)::int
       from public.campground_events e, cutoff c
      where e.campground_id = _campground_id
        and e.event_type = 'qr_scan'
        and e.occurred_at >= c.since) as qr_scans,
    (select count(*)::int
       from public.check_ins ci
       join public.profiles p on p.id = ci.profile_id,
            cutoff c
      where ci.campground_id = _campground_id
        and ci.checked_in_at >= c.since
        and p.privacy_mode = 'visible'
        and p.suspended_at is null) as check_ins,
    (select count(*)::int
       from public.campground_events e, cutoff c
      where e.campground_id = _campground_id
        and e.event_type = 'review_click'
        and e.occurred_at >= c.since) as review_clicks,
    (select count(*)::int
       from public.campground_events e, cutoff c
      where e.campground_id = _campground_id
        and e.event_type = 'book_again_click'
        and e.occurred_at >= c.since) as book_again_clicks,
    (select count(*)::int
       from public.campground_events e, cutoff c
      where e.campground_id = _campground_id
        and e.event_type = 'contact_message'
        and e.occurred_at >= c.since) as contact_messages,
    (select count(*)::int
       from public.campground_events e, cutoff c
      where e.campground_id = _campground_id
        and e.event_type = 'bulletin_view'
        and e.occurred_at >= c.since) as bulletin_views;
$$;

revoke all on function public.owner_weekly_stats_for_cron(uuid) from public;
revoke all on function public.owner_weekly_stats_for_cron(uuid) from authenticated;
revoke all on function public.owner_weekly_stats_for_cron(uuid) from anon;
grant execute on function public.owner_weekly_stats_for_cron(uuid) to service_role;

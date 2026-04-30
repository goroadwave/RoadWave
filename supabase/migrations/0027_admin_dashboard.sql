-- ============================================================================
-- 0027_admin_dashboard.sql
-- Founder admin dashboard at /admin.
--
-- Adds:
--   * profiles.is_admin (bool default false)
--   * campground_leads.status + replied_at
--   * campground_requests.status + replied_at
--   * campgrounds.is_active (bool default true)
--   * admin_audit_log table
--   * 4 SECURITY DEFINER RPCs (activity_summary, user_overview,
--     signups_30d, signup_provider_split). All guard on is_admin.
--   * admin SELECT/UPDATE policies on profiles, campground_leads,
--     campground_requests, reports, campgrounds.
--   * indexes on the new status + audit log columns.
--
-- Set yourself admin after applying:
--   update public.profiles set is_admin = true where id = '<your-uid>';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columns
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.campground_leads
  add column if not exists status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'flagged')),
  add column if not exists replied_at timestamptz;

alter table public.campground_requests
  add column if not exists status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'flagged')),
  add column if not exists replied_at timestamptz;

alter table public.campgrounds
  add column if not exists is_active boolean not null default true;

create index if not exists campground_leads_status_idx
  on public.campground_leads (status, created_at desc);
create index if not exists campground_requests_status_idx
  on public.campground_requests (status, created_at desc);
create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. admin_audit_log
-- ----------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_admin_select on public.admin_audit_log;
create policy admin_audit_log_admin_select
  on public.admin_audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

drop policy if exists admin_audit_log_admin_insert on public.admin_audit_log;
create policy admin_audit_log_admin_insert
  on public.admin_audit_log for insert
  to authenticated
  with check (
    admin_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

-- No UPDATE / DELETE policies — audit log is append-only.

-- ----------------------------------------------------------------------------
-- 3. Admin policies on existing tables
-- ----------------------------------------------------------------------------

-- profiles: admins can read every profile (needed for Reports list).
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

-- campground_leads: admin SELECT + admin UPDATE.
alter table public.campground_leads enable row level security;

drop policy if exists campground_leads_admin_select on public.campground_leads;
create policy campground_leads_admin_select
  on public.campground_leads for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

drop policy if exists campground_leads_admin_update on public.campground_leads;
create policy campground_leads_admin_update
  on public.campground_leads for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

-- campground_requests: same.
alter table public.campground_requests enable row level security;

drop policy if exists campground_requests_admin_select on public.campground_requests;
create policy campground_requests_admin_select
  on public.campground_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

drop policy if exists campground_requests_admin_update on public.campground_requests;
create policy campground_requests_admin_update
  on public.campground_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

-- reports: admin SELECT + admin UPDATE (status only enforced by
-- server-action allowlist).
drop policy if exists reports_admin_select on public.reports;
create policy reports_admin_select
  on public.reports for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update
  on public.reports for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

-- campgrounds: admin UPDATE (toggle is_active). Existing public SELECT
-- policy is unchanged.
drop policy if exists campgrounds_admin_update on public.campgrounds;
create policy campgrounds_admin_update
  on public.campgrounds for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER RPCs — every one starts with an is_admin guard.
-- ----------------------------------------------------------------------------

create or replace function public.admin_activity_summary()
returns table (
  active_checkins int,
  waves_pending int,
  waves_matched int,
  waves_connected int,
  waves_declined int,
  new_connections_today int,
  bulletins_today int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.is_admin = true
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::int from public.check_ins
       where status = 'active' and expires_at > now()),
    (select count(*)::int from public.waves where status = 'pending'),
    (select count(*)::int from public.waves where status = 'matched'),
    (select count(*)::int from public.waves where status = 'connected'),
    (select count(*)::int from public.waves where status = 'declined'),
    (select count(*)::int from public.crossed_paths
       where status = 'connected' and updated_at >= date_trunc('day', now())),
    (select count(*)::int from public.bulletins
       where created_at >= date_trunc('day', now()));
end;
$$;

revoke all on function public.admin_activity_summary() from public;
grant execute on function public.admin_activity_summary() to authenticated;

create or replace function public.admin_user_overview()
returns table (
  signups_all_time int,
  active_today int,
  active_week int,
  consent_confirmed int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.is_admin = true
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::int from public.profiles),
    (select count(distinct profile_id)::int from public.check_ins
       where checked_in_at >= date_trunc('day', now())),
    (select count(distinct profile_id)::int from public.check_ins
       where checked_in_at >= now() - interval '7 days'),
    (select count(distinct user_id)::int from public.legal_acks
       where age_confirmed = true
         and accepted_terms = true
         and accepted_rules = true);
end;
$$;

revoke all on function public.admin_user_overview() from public;
grant execute on function public.admin_user_overview() to authenticated;

create or replace function public.admin_signups_30d()
returns table (day date, count int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.is_admin = true
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  with days as (
    select generate_series(
      date_trunc('day', now()) - interval '29 days',
      date_trunc('day', now()),
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    coalesce(c.n, 0)::int as count
  from days d
  left join lateral (
    select count(*)::int as n
      from public.profiles p
     where date_trunc('day', p.created_at)::date = d.day
  ) c on true
  order by d.day;
end;
$$;

revoke all on function public.admin_signups_30d() from public;
grant execute on function public.admin_signups_30d() to authenticated;

create or replace function public.admin_signup_provider_split()
returns table (provider text, count int)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.is_admin = true
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  select
    coalesce(u.raw_app_meta_data->>'provider', 'email')::text as provider,
    count(*)::int as count
  from auth.users u
  group by 1
  order by 2 desc;
end;
$$;

revoke all on function public.admin_signup_provider_split() from public;
grant execute on function public.admin_signup_provider_split() to authenticated;

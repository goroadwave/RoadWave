-- ============================================================================
-- 0018_reports_and_suspension.sql
-- Adds the tiered report system + automatic account suspension support.
--
--   * reports table             — one row per submitted report
--   * profiles.suspended_at     — non-null = account is suspended pending review
--   * profiles.suspension_reason
--   * nearby_campers RPC        — excludes suspended users from nearby lists
-- ============================================================================

-- 1) Enums for report shape. ---------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'report_category') then
    create type public.report_category as enum ('low', 'medium', 'high');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type public.report_status as enum ('open', 'under_review', 'actioned', 'dismissed');
  end if;
end $$;

-- 2) reports table. ------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  campground_id uuid references public.campgrounds(id) on delete set null,
  category public.report_category not null,
  description text not null check (char_length(description) between 1 and 4000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists reports_reported_user_idx
  on public.reports (reported_user_id, created_at desc);
create index if not exists reports_status_idx
  on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- Reporters can SELECT and INSERT their own reports. No UPDATE / DELETE for
-- end users — moderation actions go through the service role.
drop policy if exists reports_select_own on public.reports;
create policy reports_select_own
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

-- 3) Profile suspension columns. -----------------------------------------------
alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text;

create index if not exists profiles_suspended_idx
  on public.profiles (suspended_at)
  where suspended_at is not null;

-- 4) Update nearby_campers to exclude suspended users. -------------------------
-- Signature is unchanged from 0005; we only add `and p.suspended_at is null`
-- to the WHERE clause so `create or replace` is sufficient.
create or replace function public.nearby_campers(_campground_id uuid)
returns table(
  profile_id uuid,
  username citext,
  display_name text,
  avatar_url text,
  rig_type text,
  miles_driven int,
  hometown text,
  status_tag text,
  personal_note text,
  years_rving int,
  has_pets boolean,
  pet_info text,
  travel_style text,
  interests text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    case when p.share_rig_type     then p.rig_type     end,
    case when p.share_miles_driven then p.miles_driven end,
    case when p.share_hometown     then p.hometown     end,
    case when p.share_status       then p.status_tag   end,
    case when p.share_note         then p.personal_note end,
    case when p.share_years        then p.years_rving  end,
    case when p.share_pet          then p.has_pets     end,
    case when p.share_pet          then p.pet_info     end,
    case when p.share_travel_style then p.travel_style::text end,
    case when p.share_interests then (
      select array_agg(i.slug order by i.slug)
        from public.profile_interests pi
        join public.interests i on i.id = pi.interest_id
       where pi.profile_id = p.id
    ) end as interests
  from public.profiles p
  join public.check_ins c on c.profile_id = p.id
  where c.campground_id = _campground_id
    and c.expires_at > now()
    and c.status = 'active'
    and p.privacy_mode = 'visible'
    and p.suspended_at is null
    and p.id <> (select auth.uid())
    and exists (
      select 1
        from public.check_ins c2
       where c2.profile_id = (select auth.uid())
         and c2.campground_id = _campground_id
         and c2.expires_at > now()
         and c2.status = 'active'
    );
$$;

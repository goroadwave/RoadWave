-- ============================================================================
-- 0019_owner_aggregates.sql
-- Three SECURITY DEFINER aggregate RPCs that owners can call to populate
-- the dashboard / analytics without ever seeing individual rows. Each is
-- guarded by a campground_admins membership check on the calling user.
--
-- Why this exists
-- ----------------------------------------------------------------------------
-- RLS on public.check_ins is intentionally tight — only the check-in's
-- own profile can SELECT the row. That's correct for privacy and is the
-- reason direct count queries from the owner dashboard return 0. These
-- RPCs let owners read AGGREGATE shapes (counts, group-by tallies)
-- without ever surfacing profile_id, names, emails, messages, or any
-- individual record.
--
-- The aggregates filter to "opt-in" check-ins only:
--   * profile.privacy_mode = 'visible'   (Quiet + Invisible excluded)
--   * profile.suspended_at is null       (suspended accounts excluded)
--   * check_in.status = 'active' and expires_at > now() where applicable
--
-- For the interest aggregate, we additionally require
-- profile.share_interests = true so users who toggled the share off
-- aren't counted in the owner's view.
-- ============================================================================

-- 1) Active opt-in check-in count for the dashboard headline. ----------------
create or replace function public.owner_active_checkin_count(_campground_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.campground_admins ca
       where ca.campground_id = _campground_id
         and ca.user_id = auth.uid()
    ) then (
      select count(*)::int
        from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and ci.status = 'active'
         and ci.expires_at > now()
         and p.privacy_mode = 'visible'
         and p.suspended_at is null
    )
    else 0
  end;
$$;

revoke all on function public.owner_active_checkin_count(uuid) from public;
grant execute on function public.owner_active_checkin_count(uuid) to authenticated;

-- 2) Time-bucket counts for the analytics page. ------------------------------
-- Returns three integers in one round-trip: today, last 7 days, all time.
create or replace function public.owner_checkin_counts(_campground_id uuid)
returns table(today int, week int, all_time int)
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
  )
  select
    coalesce((
      select count(*)::int
        from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and ci.checked_in_at >= date_trunc('day', now())
         and p.privacy_mode = 'visible'
         and p.suspended_at is null
         and exists (select 1 from admin)
    ), 0) as today,
    coalesce((
      select count(*)::int
        from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and ci.checked_in_at >= now() - interval '7 days'
         and p.privacy_mode = 'visible'
         and p.suspended_at is null
         and exists (select 1 from admin)
    ), 0) as week,
    coalesce((
      select count(*)::int
        from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and p.privacy_mode = 'visible'
         and p.suspended_at is null
         and exists (select 1 from admin)
    ), 0) as all_time;
$$;

revoke all on function public.owner_checkin_counts(uuid) from public;
grant execute on function public.owner_checkin_counts(uuid) to authenticated;

-- 3) Interest aggregate for the analytics page. ------------------------------
-- Returns slug + label + count for each interest selected by currently
-- checked-in opt-in users. No profile_id, no usernames — counts only.
create or replace function public.owner_interest_aggregate(_campground_id uuid)
returns table(slug text, label text, count int)
language sql
stable
security definer
set search_path = public
as $$
  select i.slug, i.label, count(*)::int as count
    from public.profile_interests pi
    join public.interests i on i.id = pi.interest_id
    join public.profiles p on p.id = pi.profile_id
    join public.check_ins ci on ci.profile_id = p.id
   where ci.campground_id = _campground_id
     and ci.status = 'active'
     and ci.expires_at > now()
     and p.privacy_mode = 'visible'
     and p.suspended_at is null
     and p.share_interests = true
     and exists (
       select 1 from public.campground_admins ca
        where ca.campground_id = _campground_id
          and ca.user_id = auth.uid()
     )
   group by i.slug, i.label
   order by count desc, i.label asc;
$$;

revoke all on function public.owner_interest_aggregate(uuid) from public;
grant execute on function public.owner_interest_aggregate(uuid) to authenticated;

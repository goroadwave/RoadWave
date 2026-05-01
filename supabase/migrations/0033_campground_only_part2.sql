alter table public.profiles
  add column if not exists share_bulletins boolean not null default true,
  add column if not exists share_meetups boolean not null default true;

drop policy if exists waves_insert_targeted on public.waves;

create policy waves_insert_targeted
  on public.waves for insert
  to authenticated
  with check (
    from_profile_id = (select auth.uid())
    and (
      select privacy_mode from public.profiles
      where id = (select auth.uid())
    ) in ('visible', 'quiet')
    and (
      select privacy_mode from public.profiles
      where id = waves.to_profile_id
    ) = 'visible'
    and exists (
      select 1
        from public.check_ins c1
        join public.check_ins c2
          on c1.campground_id = c2.campground_id
       where c1.profile_id = (select auth.uid())
         and c2.profile_id = waves.to_profile_id
         and c1.expires_at > now() and c1.status = 'active'
         and c2.expires_at > now() and c2.status = 'active'
    )
  );

create or replace function public.owner_visibility_breakdown(_campground_id uuid)
returns table (
  visible_count int,
  quiet_count int,
  invisible_count int,
  campground_only_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with admin as (
    select 1 from public.campground_admins ca
     where ca.campground_id = _campground_id
       and ca.user_id = auth.uid()
  )
  select
    coalesce((
      select count(*)::int from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and ci.status = 'active' and ci.expires_at > now()
         and p.suspended_at is null
         and p.privacy_mode = 'visible'
         and exists (select 1 from admin)
    ), 0),
    coalesce((
      select count(*)::int from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and ci.status = 'active' and ci.expires_at > now()
         and p.suspended_at is null
         and p.privacy_mode = 'quiet'
         and exists (select 1 from admin)
    ), 0),
    coalesce((
      select count(*)::int from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and ci.status = 'active' and ci.expires_at > now()
         and p.suspended_at is null
         and p.privacy_mode = 'invisible'
         and exists (select 1 from admin)
    ), 0),
    coalesce((
      select count(*)::int from public.check_ins ci
        join public.profiles p on p.id = ci.profile_id
       where ci.campground_id = _campground_id
         and ci.status = 'active' and ci.expires_at > now()
         and p.suspended_at is null
         and p.privacy_mode = 'campground_only'
         and exists (select 1 from admin)
    ), 0);
$$;

revoke all on function public.owner_visibility_breakdown(uuid) from public;
grant execute on function public.owner_visibility_breakdown(uuid) to authenticated;

drop function if exists public.admin_activity_summary();

create function public.admin_activity_summary()
returns table (
  active_checkins int,
  waves_pending int,
  waves_matched int,
  waves_connected int,
  waves_declined int,
  new_connections_today int,
  bulletins_today int,
  active_visible int,
  active_quiet int,
  active_invisible int,
  active_campground_only int
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
       where created_at >= date_trunc('day', now())),
    (select count(*)::int from public.check_ins ci
       join public.profiles p on p.id = ci.profile_id
      where ci.status = 'active' and ci.expires_at > now()
        and p.privacy_mode = 'visible'),
    (select count(*)::int from public.check_ins ci
       join public.profiles p on p.id = ci.profile_id
      where ci.status = 'active' and ci.expires_at > now()
        and p.privacy_mode = 'quiet'),
    (select count(*)::int from public.check_ins ci
       join public.profiles p on p.id = ci.profile_id
      where ci.status = 'active' and ci.expires_at > now()
        and p.privacy_mode = 'invisible'),
    (select count(*)::int from public.check_ins ci
       join public.profiles p on p.id = ci.profile_id
      where ci.status = 'active' and ci.expires_at > now()
        and p.privacy_mode = 'campground_only');
end;
$$;

revoke all on function public.admin_activity_summary() from public;
grant execute on function public.admin_activity_summary() to authenticated;

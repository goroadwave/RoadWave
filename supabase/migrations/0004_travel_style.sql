-- ============================================================================
-- 0004_travel_style.sql
-- Adds a single-select travel_style enum to profiles, plus the matching
-- share_travel_style toggle. Updates nearby_campers() to return it (redacted
-- by the toggle, like every other shareable field).
-- ============================================================================

-- 1. Enum type for travel style.
do $$ begin
  create type travel_style as enum (
    'full_timer',
    'weekender',
    'snowbird',
    'seasonal_guest',
    'camp_host',
    'work_camper',
    'solo_traveler',
    'traveling_for_work',
    'family_traveler',
    'prefer_quiet'
  );
exception when duplicate_object then null; end $$;

-- 2. Profile columns.
alter table public.profiles
  add column if not exists travel_style travel_style,
  add column if not exists share_travel_style boolean not null default true;

-- 3. Replace nearby_campers() to include travel_style.
--    Drop required because the return type signature changes.
drop function if exists public.nearby_campers(uuid);

create function public.nearby_campers(_campground_id uuid)
returns table(
  profile_id uuid,
  username citext,
  display_name text,
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

revoke all on function public.nearby_campers(uuid) from public;
grant execute on function public.nearby_campers(uuid) to authenticated;

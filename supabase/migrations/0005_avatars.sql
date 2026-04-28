-- ============================================================================
-- 0005_avatars.sql
-- Adds profile avatar uploads:
--   1. avatar_url column on profiles
--   2. 'avatars' storage bucket (public read, 5 MB cap, image-only)
--   3. RLS on storage.objects so each user only manages their own avatar
--   4. nearby_campers() RPC returns avatar_url alongside the rest
-- ============================================================================

-- 1. Profile column.
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Storage bucket — idempotent. public:true makes objects readable without
-- auth (so other campers' avatars can render). The mime + size limits keep
-- abuse low.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Storage RLS — write side only. Reads are governed by the bucket's
-- public flag. Filename convention: <user_uuid>.<ext>, so the LIKE check
-- ties each object to its owner.
drop policy if exists "users_upload_own_avatar" on storage.objects;
create policy "users_upload_own_avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  );

drop policy if exists "users_update_own_avatar" on storage.objects;
create policy "users_update_own_avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  )
  with check (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  );

drop policy if exists "users_delete_own_avatar" on storage.objects;
create policy "users_delete_own_avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  );

-- 4. nearby_campers() now returns avatar_url. Drop required because the
-- return type changes.
drop function if exists public.nearby_campers(uuid);

create function public.nearby_campers(_campground_id uuid)
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

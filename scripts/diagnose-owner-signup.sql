-- Paste these one at a time into Supabase Studio → SQL Editor.
-- Each query is independent; they tell us exactly what's missing.

-- 1) Confirm 'owner' is in the campground_role enum.
select unnest(enum_range(null::public.campground_role))::text as enum_value;
-- Expected rows: 'host', 'owner'  (if 'owner' is missing, that's the bug.)


-- 2) Confirm user_role enum exists with 'owner'.
select unnest(enum_range(null::public.user_role))::text as enum_value;
-- Expected: 'guest', 'owner', 'super_admin'


-- 3) Look at the most recent owner signup attempts.
select id, email, email_confirmed_at is not null as confirmed, created_at
  from auth.users
 order by created_at desc
 limit 5;


-- 4) For the most recent user, did the trigger create a profile?
--    And what role did it land at?
select p.id, p.username, p.role, p.display_name
  from public.profiles p
  join auth.users u on u.id = p.id
 order by u.created_at desc
 limit 5;
-- If role='guest', the action failed before setting role='owner'.
-- That means UPDATE profiles silently failed or didn't run.


-- 5) Was a campground row created for the most recent user?
select c.id, c.name, c.slug, c.owner_email, c.created_at
  from public.campgrounds c
 order by c.created_at desc
 limit 5;


-- 6) Was the campground_admins link inserted?
select ca.campground_id, ca.user_id, ca.role, c.name
  from public.campground_admins ca
  left join public.campgrounds c on c.id = ca.campground_id
 order by ca.created_at desc
 limit 5;


-- 7) Try a dry-run insert of campground_admins with role='owner'
--    against an existing campground + user. If 'owner' isn't a valid
--    enum value yet, this fails immediately.
do $$
declare
  any_cg uuid;
  any_user uuid;
begin
  select id into any_cg from public.campgrounds limit 1;
  select id into any_user from auth.users limit 1;
  if any_cg is null or any_user is null then
    raise notice 'No campground or auth user to test with';
    return;
  end if;
  begin
    insert into public.campground_admins (campground_id, user_id, role)
      values (any_cg, any_user, 'owner')
      on conflict (campground_id, user_id) do nothing;
    raise notice 'OK: owner role accepted';
    -- Don't keep the test row.
    delete from public.campground_admins
     where campground_id = any_cg and user_id = any_user and role = 'owner';
  exception when others then
    raise notice 'FAIL: %', sqlerrm;
  end;
end $$;


-- 8) Sanity-check the trigger exists.
select tgname, tgrelid::regclass, tgfoid::regproc
  from pg_trigger
 where tgname = 'on_auth_user_created';

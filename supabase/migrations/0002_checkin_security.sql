-- ============================================================================
-- 0002_checkin_security.sql
-- Tightens the QR check-in flow:
--   1. Moves qr_token off the publicly-readable campgrounds table into a new
--      admin-only campground_qr_tokens table.
--   2. Adds preview_campground_by_token() and checkin_by_token() RPCs so
--      clients never see the raw token, only the result of using one.
-- ============================================================================

-- 1. Admin-only token table.
create table if not exists public.campground_qr_tokens (
  campground_id uuid primary key references public.campgrounds(id) on delete cascade,
  token uuid unique not null default gen_random_uuid(),
  rotated_at timestamptz not null default now()
);

alter table public.campground_qr_tokens enable row level security;
-- No RLS policies → only service_role can read/write. Clients only access via
-- SECURITY DEFINER RPCs below.

-- 2. Migrate any existing tokens off the campgrounds table (idempotent).
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'campgrounds' and column_name = 'qr_token'
  ) then
    insert into public.campground_qr_tokens (campground_id, token)
    select id, qr_token from public.campgrounds
    where qr_token is not null
    on conflict (campground_id) do nothing;

    alter table public.campgrounds drop column qr_token;
  end if;
end $$;

-- Backfill: any campground without a token gets one.
insert into public.campground_qr_tokens (campground_id)
select c.id
from public.campgrounds c
left join public.campground_qr_tokens t on t.campground_id = c.id
where t.campground_id is null;

-- 3. Preview RPC — read-only, returns the campground a token points to.
create or replace function public.preview_campground_by_token(_token uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'campground_id', c.id,
    'campground_name', c.name,
    'city', c.city,
    'region', c.region
  )
  from public.campground_qr_tokens t
  join public.campgrounds c on c.id = t.campground_id
  where t.token = _token;
$$;

revoke all on function public.preview_campground_by_token(uuid) from public;
grant execute on function public.preview_campground_by_token(uuid) to authenticated;

-- 4. Check-in RPC — validates token, requires email verification, renews an
--    existing active check-in or creates a new one. Returns campground info
--    + expires_at as JSON.
create or replace function public.checkin_by_token(_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  _campground_id uuid;
  _campground_name text;
  _expires_at timestamptz;
begin
  select t.campground_id, c.name
    into _campground_id, _campground_name
    from public.campground_qr_tokens t
    join public.campgrounds c on c.id = t.campground_id
   where t.token = _token;

  if _campground_id is null then
    raise exception 'Invalid check-in token' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles
     where id = (select auth.uid())
       and email_verified_at is not null
  ) then
    raise exception 'Email verification required' using errcode = 'P0002';
  end if;

  -- Renew an existing active check-in if present.
  update public.check_ins
     set expires_at = now() + interval '24 hours',
         checked_in_at = now()
   where profile_id = (select auth.uid())
     and campground_id = _campground_id
     and status = 'active'
     and expires_at > now()
   returning expires_at into _expires_at;

  if not found then
    insert into public.check_ins (profile_id, campground_id)
    values ((select auth.uid()), _campground_id)
    returning expires_at into _expires_at;
  end if;

  return json_build_object(
    'campground_id', _campground_id,
    'campground_name', _campground_name,
    'expires_at', _expires_at
  );
end;
$$;

revoke all on function public.checkin_by_token(uuid) from public;
grant execute on function public.checkin_by_token(uuid) to authenticated;

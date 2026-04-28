-- ============================================================================
-- 0009_owner_dashboard.sql
-- Foundation for the campground owner dashboard at /owner.
--   * Adds role to profiles (guest | owner | super_admin)
--   * Extends campgrounds with owner-managed fields (address, phone, website,
--     logo_url, amenities, timezone, is_verified, is_active)
--   * Reuses campground_admins as the membership join (existing 'host' role +
--     new 'owner' role); adds RLS so owners can see + edit their own row
--   * New table: bulletins — one active per campground
--   * Storage bucket: campground-logos (public read, owner-write)
-- ============================================================================

-- 1. profiles.role -----------------------------------------------------------
do $$ begin
  create type user_role as enum ('guest', 'owner', 'super_admin');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role user_role not null default 'guest';

-- 2. campground_role enum: add 'owner' to the existing host enum -------------
do $$ begin
  alter type campground_role add value if not exists 'owner';
exception when undefined_object then null; end $$;

-- 3. campgrounds extras ------------------------------------------------------
alter table public.campgrounds
  add column if not exists address       text,
  add column if not exists phone         text,
  add column if not exists website       text,
  add column if not exists logo_url      text,
  add column if not exists amenities     text[] not null default '{}',
  add column if not exists timezone      text not null default 'America/New_York',
  add column if not exists is_verified   boolean not null default false,
  add column if not exists is_active     boolean not null default true,
  add column if not exists owner_email   text;

-- 4. RLS: campground owners can read/update their own row -------------------
-- Existing select-by-token RPC pattern stays; this adds owner self-management.
drop policy if exists campgrounds_select_owner on public.campgrounds;
create policy campgrounds_select_owner
  on public.campgrounds for select
  to authenticated
  using (
    exists (
      select 1 from public.campground_admins ca
       where ca.campground_id = id and ca.user_id = (select auth.uid())
    )
  );

drop policy if exists campgrounds_update_owner on public.campgrounds;
create policy campgrounds_update_owner
  on public.campgrounds for update
  to authenticated
  using (
    exists (
      select 1 from public.campground_admins ca
       where ca.campground_id = id and ca.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campground_admins ca
       where ca.campground_id = id and ca.user_id = (select auth.uid())
    )
  );

-- 5. campground_admins: let an owner see who else is on their campground ----
drop policy if exists campground_admins_select_self on public.campground_admins;
create policy campground_admins_select_self
  on public.campground_admins for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.campground_admins ca
       where ca.campground_id = campground_id and ca.user_id = (select auth.uid())
    )
  );

-- 6. bulletins ---------------------------------------------------------------
do $$ begin
  create type bulletin_category as enum ('event', 'special', 'alert', 'general');
exception when duplicate_object then null; end $$;

create table if not exists public.bulletins (
  id uuid primary key default gen_random_uuid(),
  campground_id uuid not null references public.campgrounds(id) on delete cascade,
  message text not null check (char_length(message) <= 280),
  category bulletin_category not null default 'general',
  posted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bulletins_active_idx
  on public.bulletins (campground_id, expires_at desc nulls last, created_at desc);

alter table public.bulletins enable row level security;

-- Owners can read/write their campground's bulletins.
drop policy if exists bulletins_owner_all on public.bulletins;
create policy bulletins_owner_all
  on public.bulletins for all
  to authenticated
  using (
    exists (
      select 1 from public.campground_admins ca
       where ca.campground_id = bulletins.campground_id
         and ca.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campground_admins ca
       where ca.campground_id = bulletins.campground_id
         and ca.user_id = (select auth.uid())
    )
  );

-- Guests checked into a campground can read its active bulletins.
drop policy if exists bulletins_guest_select on public.bulletins;
create policy bulletins_guest_select
  on public.bulletins for select
  to authenticated
  using (
    exists (
      select 1 from public.check_ins ci
       where ci.campground_id = bulletins.campground_id
         and ci.profile_id = (select auth.uid())
         and ci.status = 'active'
         and ci.expires_at > now()
    )
  );

-- 7. Storage bucket: campground-logos ---------------------------------------
insert into storage.buckets (id, name, public)
  values ('campground-logos', 'campground-logos', true)
on conflict (id) do nothing;

-- Owner can upload/delete their own campground's logo. Filename convention:
-- "<campground_id>.<ext>" — RLS keys on the leading slug matching their
-- campground id via campground_admins.
drop policy if exists campground_logos_insert on storage.objects;
create policy campground_logos_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campground-logos'
    and exists (
      select 1 from public.campground_admins ca
       where ca.user_id = (select auth.uid())
         and split_part(name, '.', 1)::uuid = ca.campground_id
    )
  );

drop policy if exists campground_logos_update on storage.objects;
create policy campground_logos_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'campground-logos'
    and exists (
      select 1 from public.campground_admins ca
       where ca.user_id = (select auth.uid())
         and split_part(name, '.', 1)::uuid = ca.campground_id
    )
  );

drop policy if exists campground_logos_delete on storage.objects;
create policy campground_logos_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'campground-logos'
    and exists (
      select 1 from public.campground_admins ca
       where ca.user_id = (select auth.uid())
         and split_part(name, '.', 1)::uuid = ca.campground_id
    )
  );

-- Public read so guest-facing pages can show logos without auth. The bucket
-- itself is public, but having an explicit select policy is good hygiene.
drop policy if exists campground_logos_select on storage.objects;
create policy campground_logos_select
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'campground-logos');

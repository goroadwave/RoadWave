-- ============================================================================
-- RoadWave initial schema
-- Apply via Supabase SQL editor, or `supabase db push` with the Supabase CLI.
-- This single migration sets up: extensions, enums, tables, indexes,
-- triggers, RLS policies, and RPC functions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------------------------------------------------------------------------
-- 2. ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type privacy_mode as enum ('visible', 'quiet', 'invisible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type check_in_status as enum ('active', 'expired', 'departed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campground_role as enum ('owner', 'host');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 3. TABLES
-- ----------------------------------------------------------------------------

-- Profiles extend auth.users 1:1. Username is required, citext for
-- case-insensitive uniqueness. share_* toggles are the per-field privacy
-- controls surfaced in the profile setup UI.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text,
  rig_type text,
  miles_driven int check (miles_driven is null or miles_driven >= 0),
  hometown text,
  status_tag text,
  personal_note text check (personal_note is null or char_length(personal_note) <= 280),
  years_rving int check (years_rving is null or (years_rving >= 0 and years_rving <= 100)),
  has_pets boolean not null default false,
  pet_info text,
  privacy_mode privacy_mode not null default 'visible',
  share_rig_type boolean not null default true,
  share_miles_driven boolean not null default true,
  share_hometown boolean not null default true,
  share_status boolean not null default true,
  share_note boolean not null default true,
  share_years boolean not null default true,
  share_pet boolean not null default true,
  share_interests boolean not null default true,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Interest catalog (lookup table seeded below).
create table if not exists public.interests (
  id smallserial primary key,
  slug text not null unique,
  label text not null
);

create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id smallint not null references public.interests(id) on delete cascade,
  primary key (profile_id, interest_id)
);

create index if not exists profile_interests_interest_idx
  on public.profile_interests (interest_id);

-- Campgrounds. qr_token is what the QR code encodes; rotating it invalidates
-- printed signage if needed.
create table if not exists public.campgrounds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text,
  region text,
  lat double precision,
  lon double precision,
  qr_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Who can post meetups for a campground.
create table if not exists public.campground_admins (
  campground_id uuid not null references public.campgrounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role campground_role not null default 'host',
  created_at timestamptz not null default now(),
  primary key (campground_id, user_id)
);

-- Active stays. expires_at = checked_in_at + 24h by default.
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  campground_id uuid not null references public.campgrounds(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  status check_in_status not null default 'active'
);

create index if not exists check_ins_active_idx
  on public.check_ins (campground_id, expires_at)
  where status = 'active';

create index if not exists check_ins_profile_idx
  on public.check_ins (profile_id, expires_at desc);

-- A wave is one-way until the recipient also waves. Unique (from, to) means
-- you can only send one wave per pairing. Reciprocal direction triggers a
-- crossed_paths insert.
create table if not exists public.waves (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  to_profile_id uuid not null references public.profiles(id) on delete cascade,
  campground_id uuid references public.campgrounds(id) on delete set null,
  sent_at timestamptz not null default now(),
  check (from_profile_id <> to_profile_id),
  unique (from_profile_id, to_profile_id)
);

create index if not exists waves_to_idx on public.waves (to_profile_id);

-- Mutual wave matches. Pair is canonicalized so (a < b) to keep uniqueness.
create table if not exists public.crossed_paths (
  id uuid primary key default gen_random_uuid(),
  profile_a_id uuid not null references public.profiles(id) on delete cascade,
  profile_b_id uuid not null references public.profiles(id) on delete cascade,
  campground_id uuid references public.campgrounds(id) on delete set null,
  matched_at timestamptz not null default now(),
  check (profile_a_id < profile_b_id),
  unique (profile_a_id, profile_b_id)
);

-- Meetup spots board. Posted by campground admins, visible to checked-in users.
create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  campground_id uuid not null references public.campgrounds(id) on delete cascade,
  posted_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_at is null or end_at > start_at)
);

create index if not exists meetups_campground_idx
  on public.meetups (campground_id, start_at);

-- Legal acceptance log. One row per accept event.
create table if not exists public.legal_acks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  ip_address inet,
  user_agent text,
  accepted_at timestamptz not null default now()
);

create index if not exists legal_acks_user_idx
  on public.legal_acks (user_id, accepted_at desc);

-- ----------------------------------------------------------------------------
-- 4. UTILITY TRIGGERS
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. AUTH HOOKS: create profile on signup, mirror email verification timestamp
-- ----------------------------------------------------------------------------

-- When a new auth.users row is inserted, create a matching profile. The
-- username is read from raw_user_meta_data.username (set at signUp() time).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, username, email_verified_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      'rv_' || substr(replace(new.id::text, '-', ''), 1, 10)
    ),
    new.email_confirmed_at
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mirror email_confirmed_at to profiles.email_verified_at so RLS policies can
-- read it without a join into the auth schema.
create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null
          or old.email_confirmed_at <> new.email_confirmed_at) then
    update public.profiles
       set email_verified_at = new.email_confirmed_at
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_email_confirmed on auth.users;
create trigger on_auth_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_email_confirmed();

-- ----------------------------------------------------------------------------
-- 6. MUTUAL WAVE TRIGGER
-- ----------------------------------------------------------------------------

-- After any wave insert, check if the reverse direction already exists. If
-- so, create a crossed_paths row. Pair is canonicalized so the unique
-- constraint catches duplicates.
create or replace function public.try_create_crossed_path()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _a uuid;
  _b uuid;
begin
  if exists (
    select 1
      from public.waves w
     where w.from_profile_id = new.to_profile_id
       and w.to_profile_id = new.from_profile_id
  ) then
    if new.from_profile_id < new.to_profile_id then
      _a := new.from_profile_id;
      _b := new.to_profile_id;
    else
      _a := new.to_profile_id;
      _b := new.from_profile_id;
    end if;

    insert into public.crossed_paths (profile_a_id, profile_b_id, campground_id)
    values (_a, _b, new.campground_id)
    on conflict (profile_a_id, profile_b_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists waves_after_insert on public.waves;
create trigger waves_after_insert
  after insert on public.waves
  for each row execute function public.try_create_crossed_path();

-- ----------------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.interests           enable row level security;
alter table public.profile_interests   enable row level security;
alter table public.campgrounds         enable row level security;
alter table public.campground_admins   enable row level security;
alter table public.check_ins           enable row level security;
alter table public.waves               enable row level security;
alter table public.crossed_paths       enable row level security;
alter table public.meetups             enable row level security;
alter table public.legal_acks          enable row level security;

-- profiles: own row, plus rows of users you've matched with via crossed_paths.
-- Direct SELECT of arbitrary other users is blocked. The nearby list goes
-- through nearby_campers() (SECURITY DEFINER) which redacts based on toggles.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_select_matched on public.profiles;
create policy profiles_select_matched
  on public.profiles for select
  to authenticated
  using (exists (
    select 1
      from public.crossed_paths cp
     where (cp.profile_a_id = (select auth.uid()) and cp.profile_b_id = profiles.id)
        or (cp.profile_b_id = (select auth.uid()) and cp.profile_a_id = profiles.id)
  ));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- (No INSERT policy: profile rows are created by the auth trigger only.)

-- interests: any logged-in user can read the catalog.
drop policy if exists interests_select on public.interests;
create policy interests_select
  on public.interests for select
  to authenticated
  using (true);

-- profile_interests: full control over your own rows.
drop policy if exists profile_interests_own on public.profile_interests;
create policy profile_interests_own
  on public.profile_interests for all
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- profile_interests: read those of users you've matched with.
drop policy if exists profile_interests_matched_select on public.profile_interests;
create policy profile_interests_matched_select
  on public.profile_interests for select
  to authenticated
  using (exists (
    select 1
      from public.crossed_paths cp
     where (cp.profile_a_id = (select auth.uid()) and cp.profile_b_id = profile_interests.profile_id)
        or (cp.profile_b_id = (select auth.uid()) and cp.profile_a_id = profile_interests.profile_id)
  ));

-- campgrounds: directory is public. Anyone (anon or authenticated) can read.
drop policy if exists campgrounds_select on public.campgrounds;
create policy campgrounds_select
  on public.campgrounds for select
  using (true);

-- campground_admins: a user can see their own admin rows (for "am I a host?" checks).
drop policy if exists campground_admins_self on public.campground_admins;
create policy campground_admins_self
  on public.campground_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

-- check_ins: own only. INSERT requires verified email.
drop policy if exists check_ins_select_own on public.check_ins;
create policy check_ins_select_own
  on public.check_ins for select
  to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists check_ins_insert_verified on public.check_ins;
create policy check_ins_insert_verified
  on public.check_ins for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.email_verified_at is not null
    )
  );

drop policy if exists check_ins_update_own on public.check_ins;
create policy check_ins_update_own
  on public.check_ins for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists check_ins_delete_own on public.check_ins;
create policy check_ins_delete_own
  on public.check_ins for delete
  to authenticated
  using (profile_id = (select auth.uid()));

-- waves: outgoing-only visibility. Inbound waves are private until mutual,
-- which is why there is NO policy that lets you SELECT waves where you are
-- the recipient.
drop policy if exists waves_select_own_outgoing on public.waves;
create policy waves_select_own_outgoing
  on public.waves for select
  to authenticated
  using (from_profile_id = (select auth.uid()));

-- waves INSERT enforces the privacy contract:
--   * sender must not be invisible
--   * target must be visible (Quiet/Invisible cannot be waved at)
--   * both parties must be actively checked in to the same campground
drop policy if exists waves_insert_targeted on public.waves;
create policy waves_insert_targeted
  on public.waves for insert
  to authenticated
  with check (
    from_profile_id = (select auth.uid())
    and (
      select privacy_mode from public.profiles
      where id = (select auth.uid())
    ) <> 'invisible'
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

-- crossed_paths: see your own matches in either canonical position.
drop policy if exists crossed_paths_select_own on public.crossed_paths;
create policy crossed_paths_select_own
  on public.crossed_paths for select
  to authenticated
  using (
    profile_a_id = (select auth.uid())
    or profile_b_id = (select auth.uid())
  );

-- meetups: visible to anyone currently checked in to that campground or
-- any admin of it.
drop policy if exists meetups_select_visible on public.meetups;
create policy meetups_select_visible
  on public.meetups for select
  to authenticated
  using (
    exists (
      select 1 from public.check_ins c
      where c.profile_id = (select auth.uid())
        and c.campground_id = meetups.campground_id
        and c.expires_at > now()
        and c.status = 'active'
    )
    or exists (
      select 1 from public.campground_admins ca
      where ca.campground_id = meetups.campground_id
        and ca.user_id = (select auth.uid())
    )
  );

drop policy if exists meetups_admin_write on public.meetups;
create policy meetups_admin_write
  on public.meetups for insert
  to authenticated
  with check (
    posted_by = (select auth.uid())
    and exists (
      select 1 from public.campground_admins ca
      where ca.campground_id = meetups.campground_id
        and ca.user_id = (select auth.uid())
    )
  );

drop policy if exists meetups_admin_update on public.meetups;
create policy meetups_admin_update
  on public.meetups for update
  to authenticated
  using (exists (
    select 1 from public.campground_admins ca
    where ca.campground_id = meetups.campground_id
      and ca.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.campground_admins ca
    where ca.campground_id = meetups.campground_id
      and ca.user_id = (select auth.uid())
  ));

drop policy if exists meetups_admin_delete on public.meetups;
create policy meetups_admin_delete
  on public.meetups for delete
  to authenticated
  using (exists (
    select 1 from public.campground_admins ca
    where ca.campground_id = meetups.campground_id
      and ca.user_id = (select auth.uid())
  ));

-- legal_acks: own only. Append-only by app convention; no UPDATE/DELETE policy.
drop policy if exists legal_acks_select_own on public.legal_acks;
create policy legal_acks_select_own
  on public.legal_acks for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists legal_acks_insert_own on public.legal_acks;
create policy legal_acks_insert_own
  on public.legal_acks for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 8. RPC: nearby_campers(_campground_id)
--    The privacy-preserving read path for the nearby list. Returns a row per
--    visible camper currently checked in, with each shareable field nulled
--    out when the target user has the corresponding share_* toggle off.
-- ----------------------------------------------------------------------------
create or replace function public.nearby_campers(_campground_id uuid)
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

-- ----------------------------------------------------------------------------
-- 9. RPC: username_available(_username)
--    Used by the signup form for live availability checks. Available to anon
--    so it can run before the user has an account.
-- ----------------------------------------------------------------------------
create or replace function public.username_available(_username text)
returns boolean
language sql
stable
as $$
  select _username ~ '^[a-zA-Z0-9_]{3,24}$'
     and not exists (
       select 1 from public.profiles
        where username = _username::citext
     );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 10. RPC: expire_old_check_ins()
--     Cron-callable sweep. Marks active check-ins past expires_at as expired.
--     Called by a Supabase Edge Function or the Next.js cron route.
-- ----------------------------------------------------------------------------
create or replace function public.expire_old_check_ins()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  _count int;
begin
  update public.check_ins
     set status = 'expired'
   where status = 'active'
     and expires_at <= now();
  get diagnostics _count = row_count;
  return _count;
end;
$$;

revoke all on function public.expire_old_check_ins() from public;
-- Service role bypasses grants, so the cron caller (which uses the service
-- key) can invoke this without an explicit grant.

-- ----------------------------------------------------------------------------
-- 11. SEED: interest catalog
-- ----------------------------------------------------------------------------
insert into public.interests (slug, label) values
  ('coffee',     'Coffee'),
  ('campfire',   'Campfire'),
  ('dogs',       'Dogs'),
  ('hiking',     'Hiking'),
  ('kayaking',   'Kayaking'),
  ('cards',      'Cards'),
  ('live_music', 'Live music')
on conflict (slug) do nothing;

-- ============================================================================
-- 0025_notifications.sql
-- Backs the live-app lantern. One row per delivered notification, written
-- by triggers on the source tables (waves, crossed_paths,
-- crossed_paths_messages, bulletins, meetups). Read by users via RLS.
-- The lantern UI fetches `where user_id = auth.uid()`.
--
--   notifications
--     id            uuid pk
--     user_id       uuid → auth.users (cascade delete)
--     type          enum
--     reference_id  uuid (the source row that triggered this notification)
--     campground_id uuid (optional, for bulletins/meetups)
--     message       text (display text — kept short, no HTML)
--     is_read       boolean default false
--     created_at    timestamptz default now()
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'wave_received',
      'wave_matched',
      'new_message',
      'bulletin',
      'meetup_invite',
      'meetup_rsvp'
    );
  end if;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  reference_id uuid,
  campground_id uuid references public.campgrounds(id) on delete set null,
  message text not null check (char_length(message) between 1 and 500),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);

create index if not exists notifications_user_recent_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- SELECT: users read only their own.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- UPDATE: users can mark their own as read. The CHECK keeps them from
-- changing user_id or other columns to spoof another user's record.
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No INSERT / DELETE policies for end users — triggers run as
-- SECURITY DEFINER and bypass RLS. End-user inserts are explicitly
-- denied.

-- ----------------------------------------------------------------------------
-- 1. Wave received: when a wave is sent, notify the recipient.
-- ----------------------------------------------------------------------------
create or replace function public.notify_wave_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_username text;
begin
  select coalesce(p.display_name, p.username::text)
    into sender_username
    from public.profiles p
   where p.id = new.from_profile_id;

  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  values (
    new.to_profile_id,
    'wave_received',
    new.id,
    new.campground_id,
    coalesce(sender_username, 'A camper') || ' sent you a wave 🏕️'
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_wave_received on public.waves;
create trigger trg_notify_wave_received
  after insert on public.waves
  for each row execute function public.notify_wave_received();

-- ----------------------------------------------------------------------------
-- 2. Wave matched: when a crossed_paths row is created, notify both users.
-- ----------------------------------------------------------------------------
create or replace function public.notify_wave_matched()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  name_a text;
  name_b text;
begin
  select coalesce(p.display_name, p.username::text) into name_a
    from public.profiles p where p.id = new.profile_a_id;
  select coalesce(p.display_name, p.username::text) into name_b
    from public.profiles p where p.id = new.profile_b_id;

  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  values (
    new.profile_a_id,
    'wave_matched',
    new.id,
    new.campground_id,
    'You matched with ' || coalesce(name_b, 'a camper') || '! Say hello 👋'
  );
  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  values (
    new.profile_b_id,
    'wave_matched',
    new.id,
    new.campground_id,
    'You matched with ' || coalesce(name_a, 'a camper') || '! Say hello 👋'
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_wave_matched on public.crossed_paths;
create trigger trg_notify_wave_matched
  after insert on public.crossed_paths
  for each row execute function public.notify_wave_matched();

-- ----------------------------------------------------------------------------
-- 3. New message: notify the OTHER party in the crossed_paths.
-- ----------------------------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cp record;
  recipient_id uuid;
  sender_username text;
begin
  select profile_a_id, profile_b_id, campground_id
    into cp
    from public.crossed_paths
   where id = new.crossed_path_id;
  if not found then
    return new;
  end if;

  recipient_id := case
    when cp.profile_a_id = new.sender_id then cp.profile_b_id
    else cp.profile_a_id
  end;

  select coalesce(p.display_name, p.username::text) into sender_username
    from public.profiles p where p.id = new.sender_id;

  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  values (
    recipient_id,
    'new_message',
    new.crossed_path_id,
    cp.campground_id,
    coalesce(sender_username, 'Someone') || ' sent you a message 💬'
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_message on public.crossed_paths_messages;
create trigger trg_notify_new_message
  after insert on public.crossed_paths_messages
  for each row execute function public.notify_new_message();

-- ----------------------------------------------------------------------------
-- 4. Bulletin posted: notify every guest currently checked in at that
--    campground.
-- ----------------------------------------------------------------------------
create or replace function public.notify_bulletin_posted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cg_name text;
  excerpt text;
begin
  select c.name into cg_name
    from public.campgrounds c where c.id = new.campground_id;

  -- Trim the bulletin to a reasonable preview.
  excerpt := case
    when char_length(new.message) <= 140 then new.message
    else substr(new.message, 1, 137) || '…'
  end;

  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  select
    ci.profile_id,
    'bulletin'::public.notification_type,
    new.id,
    new.campground_id,
    '📢 ' || coalesce(cg_name, 'Campground') || ': ' || excerpt
  from public.check_ins ci
  where ci.campground_id = new.campground_id
    and ci.status = 'active'
    and ci.expires_at > now();
  return new;
end;
$$;

drop trigger if exists trg_notify_bulletin_posted on public.bulletins;
create trigger trg_notify_bulletin_posted
  after insert on public.bulletins
  for each row execute function public.notify_bulletin_posted();

-- ----------------------------------------------------------------------------
-- 5. Meetup posted: notify every guest currently checked in at that
--    campground (treated as a meetup_invite).
-- ----------------------------------------------------------------------------
create or replace function public.notify_meetup_posted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cg_name text;
begin
  select c.name into cg_name
    from public.campgrounds c where c.id = new.campground_id;

  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  select
    ci.profile_id,
    'meetup_invite'::public.notification_type,
    new.id,
    new.campground_id,
    'New meetup at ' || coalesce(cg_name, 'your campground') || ': ' || new.title || ' 🔥'
  from public.check_ins ci
  where ci.campground_id = new.campground_id
    and ci.status = 'active'
    and ci.expires_at > now()
    and ci.profile_id <> new.posted_by;
  return new;
end;
$$;

drop trigger if exists trg_notify_meetup_posted on public.meetups;
create trigger trg_notify_meetup_posted
  after insert on public.meetups
  for each row execute function public.notify_meetup_posted();

-- ----------------------------------------------------------------------------
-- 6. RPC: mark all of the calling user's notifications as read.
--    Easier to use from the client than a generic UPDATE which RLS
--    would scope correctly anyway.
-- ----------------------------------------------------------------------------
create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
     set is_read = true
   where user_id = auth.uid()
     and is_read = false;
$$;

revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;

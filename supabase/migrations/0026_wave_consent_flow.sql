-- ============================================================================
-- 0026_wave_consent_flow.sql
-- Implements the 5-step wave flow:
--   Discover → Wave Sent → Wave Received → Mutual Consent → Connected
--
-- Schema additions:
--   * waves.status (pending/matched/declined/connected) + updated_at
--   * crossed_paths.status (pending_consent/connected/declined) +
--     consent_a + consent_b + updated_at
--   * notification_type enum gains wave_sent + wave_connected
--
-- Behavioral changes:
--   * Mutual wave still creates a crossed_paths row, but with
--     status='pending_consent' and both consent flags false. Messaging
--     RLS now requires status='connected'.
--   * notify_wave_received fires sender + receiver notifications using
--     the shared-interest copy; receiver notification is silently
--     dropped when the receiver is no longer checked in.
--   * notify_wave_matched delivers the consent-prompt copy
--     ("You have a mutual wave! Would you like to connect?") — names
--     are not revealed pre-Step 5.
--   * notify_wave_connected fires the celebration copy when both
--     campers consent.
--
-- New RPCs:
--   * wave_consent(crossed_path_id, connect boolean) — caller votes;
--     when both have consented, status flips to connected and a
--     pre-populated "Hey, nice to meet you!" message is inserted.
--   * decline_wave(wave_id) — receiver silently dismisses an incoming
--     wave (the Ignore button); also marks the corresponding
--     wave_received notification as read.
--   * incoming_wave(wave_id) — receiver-side camper-card RPC. Returns
--     rig_type + interests only — no names, no site numbers.
--   * pending_consent_summary(crossed_path_id) — same shape, used by
--     both campers for the consent prompt.
--
-- One-time backfill: pre-existing crossed_paths rows are grandfathered
-- to status='connected' (they were created under the old auto-match
-- rule and already implicitly carry both campers' consent). Existing
-- wave_matched notifications are marked read so they don't try to
-- route through the new consent prompt.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. waves: status + updated_at
-- ----------------------------------------------------------------------------
alter table public.waves
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'matched', 'declined', 'connected')),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists waves_set_updated_at on public.waves;
create trigger waves_set_updated_at
  before update on public.waves
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. crossed_paths: status + consent flags + updated_at
-- ----------------------------------------------------------------------------
alter table public.crossed_paths
  add column if not exists status text not null default 'pending_consent'
    check (status in ('pending_consent', 'connected', 'declined')),
  add column if not exists consent_a boolean not null default false,
  add column if not exists consent_b boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists crossed_paths_set_updated_at on public.crossed_paths;
create trigger crossed_paths_set_updated_at
  before update on public.crossed_paths
  for each row execute function public.set_updated_at();

-- One-time grandfathering: every existing crossed_paths row predates the
-- consent flow, so flip them to connected with both consents recorded.
-- Safe on first apply; do not re-apply this migration after the consent
-- flow is in production use.
update public.crossed_paths
   set status = 'connected', consent_a = true, consent_b = true
 where status = 'pending_consent';

-- Backfill wave statuses to match the crossed_paths state we just set.
update public.waves w
   set status = 'connected'
  from public.crossed_paths cp
 where ((w.from_profile_id = cp.profile_a_id and w.to_profile_id = cp.profile_b_id)
     or (w.from_profile_id = cp.profile_b_id and w.to_profile_id = cp.profile_a_id))
   and cp.status = 'connected';

-- Suppress the historic "You matched with X" notifications so taps on
-- those don't try to route through the new consent prompt.
update public.notifications
   set is_read = true
 where type = 'wave_matched'
   and is_read = false;

-- ----------------------------------------------------------------------------
-- 3. notification_type: add wave_sent (sender confirmation) and
--    wave_connected (celebration after both consent).
-- ----------------------------------------------------------------------------
alter type public.notification_type add value if not exists 'wave_sent';
alter type public.notification_type add value if not exists 'wave_connected';

-- ----------------------------------------------------------------------------
-- 4. try_create_crossed_path (replace): creates the row in
--    pending_consent state + flips both wave records to 'matched'.
-- ----------------------------------------------------------------------------
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
       and w.status in ('pending', 'matched')
  ) then
    if new.from_profile_id < new.to_profile_id then
      _a := new.from_profile_id;
      _b := new.to_profile_id;
    else
      _a := new.to_profile_id;
      _b := new.from_profile_id;
    end if;

    insert into public.crossed_paths (profile_a_id, profile_b_id, campground_id, status)
    values (_a, _b, new.campground_id, 'pending_consent')
    on conflict (profile_a_id, profile_b_id) do nothing;

    update public.waves
       set status = 'matched'
     where status in ('pending', 'matched')
       and ((from_profile_id = new.from_profile_id and to_profile_id = new.to_profile_id)
         or (from_profile_id = new.to_profile_id and to_profile_id = new.from_profile_id));
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. notify_wave_received (replace): sender + receiver notifications,
--    receiver gated on still being checked in. Uses one shared interest
--    in the message; falls back to "camping" if no overlap is found.
-- ----------------------------------------------------------------------------
create or replace function public.notify_wave_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _shared text;
begin
  select i.label into _shared
    from public.profile_interests pi_s
    join public.profile_interests pi_r
      on pi_s.interest_id = pi_r.interest_id
    join public.interests i on i.id = pi_s.interest_id
   where pi_s.profile_id = new.from_profile_id
     and pi_r.profile_id = new.to_profile_id
   order by i.slug
   limit 1;
  _shared := lower(coalesce(_shared, 'camping'));

  -- Sender's confirmation lantern entry.
  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  values (
    new.from_profile_id,
    'wave_sent',
    new.id,
    new.campground_id,
    'You waved at a nearby camper who shares your interest in ' || _shared || ' 👋'
  );

  -- Receiver's lantern entry — silently dropped if they're no longer
  -- checked in to the same campground.
  if exists (
    select 1 from public.check_ins c
     where c.profile_id = new.to_profile_id
       and c.campground_id = new.campground_id
       and c.status = 'active'
       and c.expires_at > now()
  ) then
    insert into public.notifications (user_id, type, reference_id, campground_id, message)
    values (
      new.to_profile_id,
      'wave_received',
      new.id,
      new.campground_id,
      'Someone nearby shares your interest in ' || _shared || ' — they waved at you 👋'
    );
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. notify_wave_matched (replace): consent-prompt copy. No name reveal.
-- ----------------------------------------------------------------------------
create or replace function public.notify_wave_matched()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  values
    (new.profile_a_id, 'wave_matched', new.id, new.campground_id,
      'You have a mutual wave! Would you like to connect? 👋'),
    (new.profile_b_id, 'wave_matched', new.id, new.campground_id,
      'You have a mutual wave! Would you like to connect? 👋');
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. notify_wave_connected (new): celebration after both consent.
-- ----------------------------------------------------------------------------
create or replace function public.notify_wave_connected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'connected' or new.status <> 'connected' then
    return new;
  end if;
  insert into public.notifications (user_id, type, reference_id, campground_id, message)
  values
    (new.profile_a_id, 'wave_connected', new.id, new.campground_id,
      'New connection 🎉 Tap to say hello.'),
    (new.profile_b_id, 'wave_connected', new.id, new.campground_id,
      'New connection 🎉 Tap to say hello.');
  return new;
end;
$$;

drop trigger if exists trg_notify_wave_connected on public.crossed_paths;
create trigger trg_notify_wave_connected
  after update of status on public.crossed_paths
  for each row execute function public.notify_wave_connected();

-- ----------------------------------------------------------------------------
-- 8. crossed_paths_messages: tighten RLS so messaging requires
--    crossed_paths.status = 'connected'. Pending-consent rows can NOT
--    be messaged; declined rows can NOT be messaged.
-- ----------------------------------------------------------------------------
drop policy if exists crossed_paths_messages_select_participants
  on public.crossed_paths_messages;
create policy crossed_paths_messages_select_participants
  on public.crossed_paths_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.crossed_paths cp
       where cp.id = crossed_path_id
         and cp.status = 'connected'
         and ((select auth.uid()) in (cp.profile_a_id, cp.profile_b_id))
    )
  );

drop policy if exists crossed_paths_messages_insert_self
  on public.crossed_paths_messages;
create policy crossed_paths_messages_insert_self
  on public.crossed_paths_messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.crossed_paths cp
       where cp.id = crossed_path_id
         and cp.status = 'connected'
         and ((select auth.uid()) in (cp.profile_a_id, cp.profile_b_id))
    )
  );

-- ----------------------------------------------------------------------------
-- 9. RPC: wave_consent — both campers must call this with connect=true
--    for the pair to flip to 'connected'. connect=false declines for
--    the pair (no notification to the other person).
-- ----------------------------------------------------------------------------
create or replace function public.wave_consent(_crossed_path_id uuid, _connect boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _cp record;
  _both boolean;
begin
  if _uid is null then return 'unauthorized'; end if;

  select * into _cp
    from public.crossed_paths
   where id = _crossed_path_id
     and (_uid in (profile_a_id, profile_b_id));
  if not found then return 'not_found'; end if;

  if _cp.status = 'declined' then return 'declined'; end if;
  if _cp.status = 'connected' then return 'connected'; end if;

  if not _connect then
    update public.crossed_paths
       set status = 'declined'
     where id = _crossed_path_id;
    update public.waves
       set status = 'declined'
     where (from_profile_id = _cp.profile_a_id and to_profile_id = _cp.profile_b_id)
        or (from_profile_id = _cp.profile_b_id and to_profile_id = _cp.profile_a_id);
    -- Mark the consent-prompt notification read so it disappears.
    update public.notifications
       set is_read = true
     where user_id = _uid
       and type = 'wave_matched'
       and reference_id = _crossed_path_id;
    return 'declined';
  end if;

  if _uid = _cp.profile_a_id then
    update public.crossed_paths
       set consent_a = true
     where id = _crossed_path_id;
  else
    update public.crossed_paths
       set consent_b = true
     where id = _crossed_path_id;
  end if;

  select consent_a and consent_b into _both
    from public.crossed_paths where id = _crossed_path_id;

  -- Mark this user's consent-prompt notification read.
  update public.notifications
     set is_read = true
   where user_id = _uid
     and type = 'wave_matched'
     and reference_id = _crossed_path_id;

  if _both then
    update public.crossed_paths
       set status = 'connected'
     where id = _crossed_path_id and status <> 'connected';
    update public.waves
       set status = 'connected'
     where (from_profile_id = _cp.profile_a_id and to_profile_id = _cp.profile_b_id)
        or (from_profile_id = _cp.profile_b_id and to_profile_id = _cp.profile_a_id);
    -- Pre-populate the friendly opener so both users land into a
    -- conversation, not an empty room.
    insert into public.crossed_paths_messages (crossed_path_id, sender_id, body)
    values (_crossed_path_id, _uid, 'Hey, nice to meet you!');
    return 'connected';
  end if;

  return 'pending';
end;
$$;

revoke all on function public.wave_consent(uuid, boolean) from public;
grant execute on function public.wave_consent(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 10. RPC: decline_wave — Ignore button on the wave_received card.
--     Silent: no notification to the sender, just status flip.
-- ----------------------------------------------------------------------------
create or replace function public.decline_wave(_wave_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _w record;
begin
  if _uid is null then return 'unauthorized'; end if;
  select * into _w
    from public.waves
   where id = _wave_id and to_profile_id = _uid;
  if not found then return 'not_found'; end if;

  update public.waves
     set status = 'declined'
   where id = _wave_id;

  update public.notifications
     set is_read = true
   where user_id = _uid
     and type = 'wave_received'
     and reference_id = _wave_id;

  return 'declined';
end;
$$;

revoke all on function public.decline_wave(uuid) from public;
grant execute on function public.decline_wave(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 11. RPC: incoming_wave — receiver fetches the privacy-redacted summary
--     of an incoming wave (rig_type + interests only).
-- ----------------------------------------------------------------------------
create or replace function public.incoming_wave(_wave_id uuid)
returns table (
  wave_id uuid,
  sender_id uuid,
  campground_id uuid,
  rig_type text,
  interests text[],
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    w.from_profile_id,
    w.campground_id,
    case when p.share_rig_type then p.rig_type end,
    case when p.share_interests then (
      select array_agg(i.slug order by i.slug)
        from public.profile_interests pi
        join public.interests i on i.id = pi.interest_id
       where pi.profile_id = w.from_profile_id
    ) end,
    w.status
  from public.waves w
  join public.profiles p on p.id = w.from_profile_id
  where w.id = _wave_id
    and w.to_profile_id = auth.uid();
$$;

revoke all on function public.incoming_wave(uuid) from public;
grant execute on function public.incoming_wave(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 12. RPC: pending_consent_summary — returns the OTHER party's
--     rig_type + interests for the consent prompt.
-- ----------------------------------------------------------------------------
create or replace function public.pending_consent_summary(_crossed_path_id uuid)
returns table (
  crossed_path_id uuid,
  campground_id uuid,
  rig_type text,
  interests text[],
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.id,
    cp.campground_id,
    case when other.share_rig_type then other.rig_type end,
    case when other.share_interests then (
      select array_agg(i.slug order by i.slug)
        from public.profile_interests pi
        join public.interests i on i.id = pi.interest_id
       where pi.profile_id = other.id
    ) end,
    cp.status
  from public.crossed_paths cp
  join public.profiles other
    on other.id = case when cp.profile_a_id = auth.uid()
                       then cp.profile_b_id else cp.profile_a_id end
  where cp.id = _crossed_path_id
    and (auth.uid() in (cp.profile_a_id, cp.profile_b_id));
$$;

revoke all on function public.pending_consent_summary(uuid) from public;
grant execute on function public.pending_consent_summary(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 13. nearby_campers (replace): redact ALL identifying fields. The
--     discovery screen now shows shared interests + rig type only —
--     no names, no avatars, no notes, no hometown, no miles, no pets.
--     Names + richer profile data are gated behind the post-connection
--     view (which reads through profiles_select_matched RLS).
-- ----------------------------------------------------------------------------
drop function if exists public.nearby_campers(uuid);
create function public.nearby_campers(_campground_id uuid)
returns table(
  profile_id uuid,
  rig_type text,
  interests text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    case when p.share_rig_type then p.rig_type end,
    case when p.share_interests then (
      select array_agg(i.slug order by i.slug)
        from public.profile_interests pi
        join public.interests i on i.id = pi.interest_id
       where pi.profile_id = p.id
    ) end
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

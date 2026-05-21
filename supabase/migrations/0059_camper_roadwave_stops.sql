-- 0059_camper_roadwave_stops.sql
--
-- Private camper-side history of which campgrounds a signed-in
-- camper has joined/scanned over time. Powers the "RoadWave Stops"
-- list on the camper account page.
--
-- Strict separation from active presence:
--   * camper_roadwave_stops is HISTORICAL. It records that user X
--     was at campground Y at some point, with a visit counter and
--     last-seen timestamp. Nothing here makes the camper appear in
--     "Campers Here" anywhere.
--   * check_ins remains the only source of truth for current
--     presence. nearby_campers() reads check_ins only -- a row in
--     camper_roadwave_stops does NOT cause the camper to show up
--     at any campground they're not currently checked in to.
--
-- RLS:
--   * SELECT: a camper sees their own stops only.
--   * INSERT / UPDATE / DELETE: not granted to authenticated. The
--     record_roadwave_stop() SECURITY DEFINER RPC is the only path
--     that mutates rows, so a hostile client can't forge stops at
--     campgrounds they never visited or inflate someone else's
--     counter.
--
-- Upsert semantics handled by the RPC, not the table:
--   * First visit ever: insert with visit_count = 1, first_seen_at
--     and last_seen_at = now().
--   * Return visit (last_seen_at older than 12h): increment
--     visit_count, update last_seen_at. The 12h window matches the
--     shape of a typical RV stay -- two reloads 30 minutes apart
--     shouldn't show up as two trips.
--   * Same-session reload: just bump last_seen_at, leave the
--     counter alone.
--
-- What this migration does NOT do:
--   * No changes to check_ins, nearby_campers(), or any other
--     presence path. RoadWave Stops is a parallel surface.
--   * No public-facing exposure. The table is RLS-locked to the
--     owning user; only the account page renders any of it.
--   * No connections-count / waves-count fields yet -- those can be
--     denormalized later from waves + crossed_paths if needed for
--     performance. The account page's first version reads from
--     existing tables.

create table if not exists public.camper_roadwave_stops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campground_id uuid not null references public.campgrounds(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  visit_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, campground_id)
);

comment on table public.camper_roadwave_stops is
  'Private per-camper history of campgrounds joined/scanned. NOT a presence signal — see check_ins for active presence.';

create index if not exists camper_roadwave_stops_user_idx
  on public.camper_roadwave_stops (user_id, last_seen_at desc);

alter table public.camper_roadwave_stops enable row level security;

-- SELECT: each camper reads their own rows. No anon read path.
create policy "Campers select their own roadwave stops"
  on public.camper_roadwave_stops
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No INSERT/UPDATE/DELETE policies on purpose. The RPC below is
-- security definer and is the only mutation path.

-- record_roadwave_stop: upsert with three branches.
--   1. No row yet -> insert. visit_count = 1.
--   2. Existing row, last_seen_at older than 12h -> bump counter +
--      last_seen_at. This is a "return trip".
--   3. Existing row, last_seen_at within the 12h window -> just
--      refresh last_seen_at. Same session, no counter inflation.
--
-- security definer because the table has no INSERT/UPDATE policies
-- granted to authenticated; the RPC runs as the table owner. We pin
-- search_path = public to keep the function deterministic regardless
-- of the caller's search_path.
create or replace function public.record_roadwave_stop(_campground_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := (select auth.uid());
  _prev_last timestamptz;
begin
  if _uid is null then return; end if;

  -- Validate the campground id refers to an active campground. We
  -- don't want a stale token to create a stop row pointing at a
  -- deactivated/deleted campground.
  if not exists (
    select 1 from public.campgrounds
     where id = _campground_id and is_active = true
  ) then
    return;
  end if;

  select last_seen_at into _prev_last
    from public.camper_roadwave_stops
   where user_id = _uid and campground_id = _campground_id;

  if _prev_last is null then
    insert into public.camper_roadwave_stops (user_id, campground_id)
    values (_uid, _campground_id);
  elsif _prev_last < now() - interval '12 hours' then
    update public.camper_roadwave_stops
       set last_seen_at = now(),
           visit_count = visit_count + 1,
           updated_at = now()
     where user_id = _uid and campground_id = _campground_id;
  else
    update public.camper_roadwave_stops
       set last_seen_at = now(),
           updated_at = now()
     where user_id = _uid and campground_id = _campground_id;
  end if;
end;
$$;

revoke all on function public.record_roadwave_stop(uuid) from public;
grant execute on function public.record_roadwave_stop(uuid) to authenticated;

comment on function public.record_roadwave_stop(uuid) is
  'Idempotent upsert of a private camper_roadwave_stops row. Caller is auth.uid(); same-session reloads do not inflate visit_count (12h dedupe).';

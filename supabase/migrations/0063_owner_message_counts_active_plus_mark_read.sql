-- 0063_owner_message_counts_active_plus_mark_read.sql
--
-- Two related upgrades to the owner messages flow so the nav badge
-- "glow" stops when the owner actually checks the page:
--
-- 1. owner_message_counts now also returns `active_total` so the nav
--    badge can render two distinct states:
--      * unread_total > 0           -> pulsing pill (attention needed
--                                       right now -- brand-new guest
--                                       messages)
--      * unread_total = 0 AND
--        active_total > 0           -> static pill (still messages to
--                                       handle, but nothing brand
--                                       new since last visit)
--      * both zero                  -> no pill, no glow
--    "active" = new OR read (a row that hasn't yet been resolved or
--    archived). Resolved + archived rows never contribute to the
--    badge -- they live under their dedicated tabs.
--
-- 2. New RPC owner_mark_messages_read_for_campground(_campground_id)
--    flips every 'new' message on the campground to 'read' in one
--    transaction. Called from /owner/messages on render so opening
--    the inbox naturally stops the glow without requiring the owner
--    to tap each row individually. Idempotent: re-running with no
--    new rows is a no-op.
--
-- Both RPCs gated on campground_admins membership inside the
-- function body so a forged campground_id never lets one owner
-- read or mutate another's data.

-- ---------------------------------------------------------------------------
-- owner_message_counts -- add active_total to the return shape.
-- ---------------------------------------------------------------------------
drop function if exists public.owner_message_counts(uuid);

create or replace function public.owner_message_counts(
  _campground_id uuid
)
returns table (
  unread_total bigint,
  unread_safety bigint,
  active_total bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.campground_admins
    where campground_id = _campground_id
      and user_id = auth.uid()
  ) then
    -- Unauthorized: return zeros, not an error. The badge poller
    -- treats a non-ok response as "no unread", so this keeps the
    -- UI stable for legitimate auth lapses.
    return query select 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  return query
  select
    count(*) filter (where m.status = 'new')                                  as unread_total,
    count(*) filter (where m.status = 'new' and m.category = 'safety_concern') as unread_safety,
    count(*) filter (where m.status in ('new', 'read'))                       as active_total
  from public.campground_messages m
  where m.campground_id = _campground_id;
end;
$$;

revoke all on function public.owner_message_counts(uuid) from public;
grant execute on function public.owner_message_counts(uuid) to authenticated;

comment on function public.owner_message_counts(uuid) is
  'Owner nav-badge counts for a campground. Returns unread_total (status=new), unread_safety (status=new AND category=safety_concern), and active_total (status in new/read). Membership-gated.';

-- ---------------------------------------------------------------------------
-- owner_mark_messages_read_for_campground -- flip new -> read in one shot.
-- ---------------------------------------------------------------------------
create or replace function public.owner_mark_messages_read_for_campground(
  _campground_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _rows_updated integer;
begin
  if not exists (
    select 1 from public.campground_admins
    where campground_id = _campground_id
      and user_id = auth.uid()
  ) then
    -- Unauthorized: no-op, return 0. Same defensive shape as
    -- owner_message_counts: we never raise, we never write,
    -- we never disclose another campground's data.
    return 0;
  end if;

  update public.campground_messages m
     set status = 'read',
         read_at = coalesce(m.read_at, now())
   where m.campground_id = _campground_id
     and m.status = 'new';

  get diagnostics _rows_updated = row_count;
  return _rows_updated;
end;
$$;

revoke all on function public.owner_mark_messages_read_for_campground(uuid) from public;
grant execute on function public.owner_mark_messages_read_for_campground(uuid) to authenticated;

comment on function public.owner_mark_messages_read_for_campground(uuid) is
  'Bulk mark all new -> read for one campground. Called on /owner/messages render so the nav glow stops once the owner opens the page. Membership-gated. Returns number of rows updated.';

-- Force PostgREST to pick up the new function + the updated counts
-- return shape. Function-cache reloads independently of table cache
-- (per the meetup_dismissals saga -- the function path is the
-- reliable one).
notify pgrst, 'reload schema';

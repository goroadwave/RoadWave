-- 0062_dismiss_meetup_rpc.sql
--
-- SECURITY DEFINER RPC that performs the per-camper meetup dismiss
-- entirely server-side. Same end-state as the direct INSERT into
-- meetup_dismissals (mig 0061) -- this just routes the call through
-- a Postgres function instead of a PostgREST table write.
--
-- Why this exists:
--   The direct .from('meetup_dismissals').upsert(...) write in
--   dismissMeetupAction was failing with PGRST205 ("Could not find
--   the table 'public.meetup_dismissals' in the schema cache") even
--   AFTER mig 0061 ran successfully and `notify pgrst, 'reload
--   schema'` returned cleanly. PostgREST's table cache can get
--   wedged in ways that NOTIFY doesn't always recover from. RPC
--   calls go through a different code path; the function name +
--   signature are cached separately and reload more reliably.
--
-- Behaviour: identical to the prior action body --
--   * upsert into meetup_dismissals (idempotent on the PK)
--   * mark related meetup notifications as read so the AppNav
--     Meetups badge clears immediately
-- All inside one transaction. SECURITY DEFINER lets the function
-- write the dismissal row even if the table's RLS is somehow not
-- yet visible to the caller's role -- the function ITSELF gates
-- on auth.uid() so a hostile client can only dismiss for themselves.
--
-- Caller path:
--   supabase.rpc('dismiss_meetup', { _meetup_id: '<uuid>' })

create or replace function public.dismiss_meetup(_meetup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
begin
  if _uid is null then
    raise exception 'auth.uid() is null -- must be signed in to dismiss a meetup';
  end if;

  insert into public.meetup_dismissals (user_id, meetup_id)
  values (_uid, _meetup_id)
  on conflict (user_id, meetup_id) do nothing;

  update public.notifications
  set is_read = true
  where reference_id = _meetup_id
    and type in ('meetup_invite', 'meetup_rsvp')
    and user_id = _uid;
end;
$$;

comment on function public.dismiss_meetup(uuid) is
  'Per-camper dismiss a meetup from THEIR /meetups list. Idempotent; also clears related notification badges. RPC wrapper because PostgREST''s table cache for meetup_dismissals can lag.';

grant execute on function public.dismiss_meetup(uuid) to authenticated;

-- Force the schema cache to pick up the new function immediately.
-- Functions cache reloads independently of the table cache, so this
-- usually takes effect within a few seconds even if the table cache
-- is still wedged.
notify pgrst, 'reload schema';

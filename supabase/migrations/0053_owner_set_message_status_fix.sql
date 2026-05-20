-- 0053_owner_set_message_status_fix.sql
-- Fixes a plpgsql column-name ambiguity introduced by mig 0052.
--
-- Background
-- ----------
-- In mig 0052, owner_set_message_status declared RETURNS TABLE with
-- output column names id, status, read_at, resolved_at. Those names
-- collide with the public.campground_messages column names referenced
-- inside the function body's UPDATE statement, so Postgres raises
-- "column reference id is ambiguous" when the function is invoked.
--
-- Fix: rename the RETURNS TABLE output parameters with an out_ prefix
-- and update the returning clause to project them by aliased names.
-- The new alias is a function-signature change, so we DROP + CREATE
-- (same convention as the owner_messages_for_campground bump in 0052).
-- No table data is touched.
--
-- What this migration does NOT do
--   No DELETE, no UPDATE on existing rows, no DROP TABLE.
--   No changes to columns, indexes, RLS, or grants outside this one
--     function.
--   No changes to Stripe, billing, env vars.

drop function if exists public.owner_set_message_status(uuid, text);

create or replace function public.owner_set_message_status(
  _message_id uuid,
  _new_status text
)
returns table(
  out_id uuid,
  out_status text,
  out_read_at timestamptz,
  out_resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _cg_id uuid;
begin
  if _new_status not in ('new', 'read', 'resolved') then
    raise exception 'invalid status: %', _new_status;
  end if;

  select campground_id into _cg_id
    from public.campground_messages
   where id = _message_id;

  if _cg_id is null then
    raise exception 'message not found';
  end if;

  if not exists (
    select 1 from public.campground_admins ca
     where ca.campground_id = _cg_id
       and ca.user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  return query
  update public.campground_messages m
     set status = _new_status,
         read_at = case
           when _new_status = 'read' then coalesce(m.read_at, now())
           when _new_status = 'resolved' then coalesce(m.read_at, now())
           when _new_status = 'new' then null
         end,
         resolved_at = case
           when _new_status = 'resolved' then coalesce(m.resolved_at, now())
           else null
         end
   where m.id = _message_id
   returning m.id, m.status, m.read_at, m.resolved_at;
end;
$$;

revoke all on function public.owner_set_message_status(uuid, text) from public;
grant execute on function public.owner_set_message_status(uuid, text) to authenticated;

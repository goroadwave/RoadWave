-- 0054_campground_messages_archive.sql
-- Adds archive support to the owner messages inbox.
--
-- Status enum gains a new 'archived' value. New archived_at timestamp
-- column stamps when an owner archived the row. Three RPC changes:
--   * owner_set_message_status now accepts 'archived' and stamps /
--     clears archived_at on transitions.
--   * owner_archive_all_resolved bulk-archives every resolved row for
--     the caller's campground.
--   * owner_delete_archived_message hard-deletes a single row, but
--     ONLY when status='archived'. Safety guard so a misfire from
--     another caller can never wipe an active message.
--
-- All RPCs are SECURITY DEFINER and ownership-gated via
-- campground_admins membership. No grants added to anon.

alter table public.campground_messages
  add column if not exists archived_at timestamptz;

alter table public.campground_messages
  drop constraint if exists campground_messages_status_check;
alter table public.campground_messages
  add constraint campground_messages_status_check
  check (status in ('new', 'read', 'resolved', 'archived'));

comment on column public.campground_messages.archived_at is
  'Stamped when an owner moves status to archived. Cleared if status moves back to new / read / resolved.';

drop function if exists public.owner_set_message_status(uuid, text);

create or replace function public.owner_set_message_status(
  _message_id uuid,
  _new_status text
)
returns table(
  out_id uuid,
  out_status text,
  out_read_at timestamptz,
  out_resolved_at timestamptz,
  out_archived_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _cg_id uuid;
begin
  if _new_status not in ('new', 'read', 'resolved', 'archived') then
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
           when _new_status = 'archived' then coalesce(m.read_at, now())
           when _new_status = 'new' then null
         end,
         resolved_at = case
           when _new_status = 'resolved' then coalesce(m.resolved_at, now())
           when _new_status = 'archived' then coalesce(m.resolved_at, now())
           else null
         end,
         archived_at = case
           when _new_status = 'archived' then coalesce(m.archived_at, now())
           else null
         end
   where m.id = _message_id
   returning m.id, m.status, m.read_at, m.resolved_at, m.archived_at;
end;
$$;

revoke all on function public.owner_set_message_status(uuid, text) from public;
grant execute on function public.owner_set_message_status(uuid, text) to authenticated;

create or replace function public.owner_archive_all_resolved(
  _campground_id uuid
)
returns table(out_archived_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  _count integer;
begin
  if not exists (
    select 1 from public.campground_admins ca
     where ca.campground_id = _campground_id
       and ca.user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  update public.campground_messages
     set status = 'archived',
         archived_at = coalesce(archived_at, now())
   where campground_id = _campground_id
     and status = 'resolved';

  get diagnostics _count = row_count;
  return query select _count;
end;
$$;

revoke all on function public.owner_archive_all_resolved(uuid) from public;
grant execute on function public.owner_archive_all_resolved(uuid) to authenticated;

create or replace function public.owner_delete_archived_message(
  _message_id uuid
)
returns table(out_deleted_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  _cg_id uuid;
  _status text;
begin
  select campground_id, status into _cg_id, _status
    from public.campground_messages
   where id = _message_id;

  if _cg_id is null then
    raise exception 'message not found';
  end if;

  if _status <> 'archived' then
    raise exception 'only archived messages can be permanently deleted';
  end if;

  if not exists (
    select 1 from public.campground_admins ca
     where ca.campground_id = _cg_id
       and ca.user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.campground_messages
   where id = _message_id;

  return query select _message_id;
end;
$$;

revoke all on function public.owner_delete_archived_message(uuid) from public;
grant execute on function public.owner_delete_archived_message(uuid) to authenticated;

drop function if exists public.owner_messages_for_campground(uuid, int);

create or replace function public.owner_messages_for_campground(
  _campground_id uuid,
  _limit int default 100
)
returns table(
  id uuid,
  source text,
  category text,
  body text,
  guest_contact text,
  status text,
  submitted_at timestamptz,
  site_number text,
  first_name text,
  last_name text,
  phone text,
  email text,
  preferred_contact_method text,
  read_at timestamptz,
  resolved_at timestamptz,
  archived_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id, m.source, m.category, m.body, m.guest_contact, m.status, m.submitted_at,
    m.site_number, m.first_name, m.last_name, m.phone, m.email,
    m.preferred_contact_method, m.read_at, m.resolved_at, m.archived_at
    from public.campground_messages m
   where m.campground_id = _campground_id
     and exists (
       select 1 from public.campground_admins ca
        where ca.campground_id = _campground_id
          and ca.user_id = auth.uid()
     )
   order by m.submitted_at desc
   limit greatest(1, least(_limit, 500));
$$;

revoke all on function public.owner_messages_for_campground(uuid, int) from public;
grant execute on function public.owner_messages_for_campground(uuid, int) to authenticated;

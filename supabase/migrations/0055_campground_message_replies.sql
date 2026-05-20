-- 0055_campground_message_replies.sql
-- Private two-way reply threads attached to a Contact the Office message.
--
-- What this migration adds
-- ------------------------
--   1. Two new columns on public.campground_messages:
--        guest_reply_token            text  -- URL-safe random; minted by
--                                              the API at insert time.
--        guest_reply_token_expires_at timestamptz  -- soft expiry, set by
--                                                     the API (default 90d).
--      A partial-unique index enforces no two live messages share a token.
--
--   2. New table public.campground_message_replies -- append-only thread
--      storage. Either side can post: owners via campground_admins
--      membership, guests via token + site_number + last_name match.
--      RLS enabled with NO policies => service-role-only direct access.
--      All reads / writes flow through the SECURITY DEFINER RPCs below.
--
--   3. Four SECURITY DEFINER RPCs:
--        owner_post_message_reply (uuid, text)
--          -- owner adds a reply; gated by campground_admins membership.
--        owner_message_thread     (uuid)
--          -- owner reads the ordered thread.
--        guest_message_thread     (uuid, text, text, text)
--          -- token + site_number + last_name match required.
--             Returns the original message body + each reply.
--             Granted to anon (no login required).
--        guest_post_message_reply (uuid, text, text, text, text)
--          -- same gate as guest_message_thread. Appends a reply AND
--             re-opens the parent message (status -> 'new'; clears
--             read_at / resolved_at / archived_at) so the owner unread
--             badge + toaster fire the same way a fresh contact
--             submission does. Granted to anon.

alter table public.campground_messages
  add column if not exists guest_reply_token text,
  add column if not exists guest_reply_token_expires_at timestamptz;

create unique index if not exists campground_messages_guest_reply_token_idx
  on public.campground_messages (guest_reply_token)
  where guest_reply_token is not null;

create table if not exists public.campground_message_replies (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid not null references public.campground_messages(id) on delete cascade,
  campground_id   uuid not null references public.campgrounds(id) on delete cascade,
  sender_type     text not null check (sender_type in ('owner', 'guest')),
  sender_user_id  uuid references auth.users(id) on delete set null,
  body            text not null check (length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);

create index if not exists campground_message_replies_message_idx
  on public.campground_message_replies (message_id, created_at);

alter table public.campground_message_replies enable row level security;

create or replace function public.owner_post_message_reply(
  _message_id uuid,
  _body text
)
returns table(
  out_id uuid,
  out_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _cg_id uuid;
  _trim text;
begin
  _trim := trim(coalesce(_body, ''));
  if char_length(_trim) = 0 then
    raise exception 'reply body required';
  end if;
  if char_length(_trim) > 4000 then
    raise exception 'reply too long';
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
  insert into public.campground_message_replies (
    message_id, campground_id, sender_type, sender_user_id, body
  ) values (
    _message_id, _cg_id, 'owner', auth.uid(), _trim
  )
  returning id, created_at;
end;
$$;

revoke all on function public.owner_post_message_reply(uuid, text) from public;
grant execute on function public.owner_post_message_reply(uuid, text) to authenticated;

create or replace function public.owner_message_thread(
  _message_id uuid
)
returns table(
  id uuid,
  sender_type text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.sender_type, r.body, r.created_at
    from public.campground_message_replies r
   where r.message_id = _message_id
     and exists (
       select 1
         from public.campground_messages m
         join public.campground_admins ca on ca.campground_id = m.campground_id
        where m.id = _message_id
          and ca.user_id = auth.uid()
     )
   order by r.created_at asc;
$$;

revoke all on function public.owner_message_thread(uuid) from public;
grant execute on function public.owner_message_thread(uuid) to authenticated;

create or replace function public.guest_message_thread(
  _message_id uuid,
  _token text,
  _site_number text,
  _last_name text
)
returns table(
  message_body text,
  message_submitted_at timestamptz,
  campground_name text,
  reply_id uuid,
  reply_sender text,
  reply_body text,
  reply_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with m as (
    select
      m.id,
      m.body,
      m.submitted_at,
      c.name as campground_name
      from public.campground_messages m
      join public.campgrounds c on c.id = m.campground_id
     where m.id = _message_id
       and m.guest_reply_token is not null
       and m.guest_reply_token = _token
       and (
         m.guest_reply_token_expires_at is null
         or m.guest_reply_token_expires_at > now()
       )
       and length(trim(coalesce(_site_number, ''))) > 0
       and length(trim(coalesce(_last_name,   ''))) > 0
       and lower(trim(coalesce(m.site_number, ''))) = lower(trim(coalesce(_site_number, '')))
       and lower(trim(coalesce(m.last_name,   ''))) = lower(trim(coalesce(_last_name,   '')))
  )
  select
    m.body            as message_body,
    m.submitted_at    as message_submitted_at,
    m.campground_name as campground_name,
    r.id              as reply_id,
    r.sender_type     as reply_sender,
    r.body            as reply_body,
    r.created_at      as reply_created_at
    from m
    left join public.campground_message_replies r on r.message_id = m.id
   order by r.created_at asc nulls first;
$$;

revoke all on function public.guest_message_thread(uuid, text, text, text) from public;
grant execute on function public.guest_message_thread(uuid, text, text, text) to anon, authenticated;

create or replace function public.guest_post_message_reply(
  _message_id uuid,
  _token text,
  _site_number text,
  _last_name text,
  _body text
)
returns table(
  out_id uuid,
  out_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _cg_id uuid;
  _trim text;
  _new_id uuid;
  _new_created_at timestamptz;
begin
  _trim := trim(coalesce(_body, ''));
  if char_length(_trim) = 0 then
    raise exception 'reply body required';
  end if;
  if char_length(_trim) > 4000 then
    raise exception 'reply too long';
  end if;

  select m.campground_id into _cg_id
    from public.campground_messages m
   where m.id = _message_id
     and m.guest_reply_token is not null
     and m.guest_reply_token = _token
     and (
       m.guest_reply_token_expires_at is null
       or m.guest_reply_token_expires_at > now()
     )
     and length(trim(coalesce(_site_number, ''))) > 0
     and length(trim(coalesce(_last_name,   ''))) > 0
     and lower(trim(coalesce(m.site_number, ''))) = lower(trim(coalesce(_site_number, '')))
     and lower(trim(coalesce(m.last_name,   ''))) = lower(trim(coalesce(_last_name,   '')));

  if _cg_id is null then
    raise exception 'not authorized';
  end if;

  insert into public.campground_message_replies (
    message_id, campground_id, sender_type, sender_user_id, body
  ) values (
    _message_id, _cg_id, 'guest', null, _trim
  )
  returning id, created_at
  into _new_id, _new_created_at;

  update public.campground_messages
     set status      = 'new',
         read_at     = null,
         resolved_at = null,
         archived_at = null
   where id = _message_id;

  out_id := _new_id;
  out_created_at := _new_created_at;
  return next;
end;
$$;

revoke all on function public.guest_post_message_reply(uuid, text, text, text, text) from public;
grant execute on function public.guest_post_message_reply(uuid, text, text, text, text) to anon, authenticated;

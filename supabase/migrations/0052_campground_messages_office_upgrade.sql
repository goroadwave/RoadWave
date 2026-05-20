-- 0052_campground_messages_office_upgrade.sql
-- "Practical Office Version" upgrade for /owner/messages + the
-- Contact the Office form.
--
-- Background
-- ----------
-- Migration 0039 created campground_messages with a single
-- guest_contact text column that mashed phone OR email OR site number
-- OR a name into one free-form blob. Owners told us they want to
-- triage by site/last-name and reply by their preferred channel.
-- This migration adds the structured fields needed for that.
--
-- What this migration does
-- ------------------------
--   (a) Adds eight new columns to public.campground_messages:
--         site_number               text       -- required on the form,
--                                                 ≤ 60 chars at the
--                                                 app layer.
--         first_name                text       -- optional, ≤ 80 chars.
--         last_name                 text       -- required, ≤ 80 chars.
--         phone                     text       -- required iff
--                                                 preferred_contact_method
--                                                 is 'phone' or 'text'.
--                                                 ≤ 60 chars.
--         email                     text       -- required iff
--                                                 preferred_contact_method
--                                                 is 'email'. ≤ 200 chars.
--         preferred_contact_method  text       -- 'phone' | 'text' |
--                                                 'email' | 'no_reply'.
--                                                 Required on the form.
--         read_at                   timestamptz -- set when status moves
--                                                  to 'read' from 'new'.
--                                                  Cleared on transition
--                                                  back to 'new'.
--         resolved_at               timestamptz -- set when status moves
--                                                  to 'resolved'. Cleared
--                                                  on transition back to
--                                                  'new' or 'read'.
--
--   (b) Adds a CHECK constraint on preferred_contact_method that
--       restricts it to the four-option allow-list (NULL allowed so
--       legacy rows that pre-date this migration don't violate it).
--
-- Why structured columns instead of overloading guest_contact
-- -----------------------------------------------------------
-- The owner inbox needs to render distinct fields (site number, last
-- name, "Reply by Email" mailto link, "Call" tel link, "Text" sms
-- link). Parsing the legacy free-form blob is error-prone. New rows
-- write the structured fields; the legacy guest_contact column stays
-- on the table so historical rows still render their original text
-- in the inbox.
--
-- Privacy
-- -------
-- site_number, first_name, last_name, phone, and email are owner-only.
-- They are inserted via the service-role admin path in
-- /api/campground/message and read via the
-- owner_messages_for_campground RPC, which is gated by
-- campground_admins membership. No grants are added for the anon role.
-- These fields are NEVER selected by any guest-facing page, camper
-- discovery query, wave query, or public profile read path. The
-- guest hub at /campground/<slug> reads only the campgrounds row.
--
-- What this migration does NOT do
-- -------------------------------
--   * No DELETE, no UPDATE, no DROP -- pure additive DDL.
--   * No changes to existing rows -- the new columns are nullable and
--     historical rows pass through with NULLs in all eight.
--   * No changes to row-level RLS policies (campground_messages still
--     has no policies; service-role-only writes; owner reads via the
--     SECURITY DEFINER RPC).
--   * No changes to the guest_contact / category / status / source
--     columns. The status enum stays at 'new' | 'read' | 'resolved'.
--   * No changes to Stripe, billing, prices, webhooks, env vars,
--     customer records.
--   * No new tables.
--   * No grants to anon -- these are PII columns by design.

alter table public.campground_messages
  add column if not exists site_number text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists preferred_contact_method text,
  add column if not exists read_at timestamptz,
  add column if not exists resolved_at timestamptz;

-- Allow-list for preferred_contact_method. NULL allowed so the legacy
-- rows that pre-date this migration don't violate the constraint.
alter table public.campground_messages
  drop constraint if exists campground_messages_preferred_contact_check;
alter table public.campground_messages
  add constraint campground_messages_preferred_contact_check
  check (
    preferred_contact_method is null or preferred_contact_method in (
      'phone',
      'text',
      'email',
      'no_reply'
    )
  );

comment on column public.campground_messages.site_number is
  'Owner-only guest pointer. Required on new contact-form submissions; NULL on legacy rows + pulse_needs_attention rows.';
comment on column public.campground_messages.last_name is
  'Owner-only guest last name. Required on new contact-form submissions; NULL on legacy + pulse rows.';
comment on column public.campground_messages.first_name is
  'Owner-only guest first name. Optional even on new submissions.';
comment on column public.campground_messages.phone is
  'Owner-only guest phone. Required iff preferred_contact_method is phone or text.';
comment on column public.campground_messages.email is
  'Owner-only guest email. Required iff preferred_contact_method is email.';
comment on column public.campground_messages.preferred_contact_method is
  'How the guest wants to be reached: phone / text / email / no_reply. NULL on legacy + pulse rows.';
comment on column public.campground_messages.read_at is
  'Stamped when an owner moves status from "new" to "read". Cleared if status moves back to "new".';
comment on column public.campground_messages.resolved_at is
  'Stamped when an owner moves status to "resolved". Cleared if status moves back to "new" or "read".';

-- ----------------------------------------------------------------------------
-- Bump owner_messages_for_campground to return the new columns.
--
-- Postgres requires a DROP FUNCTION before a CREATE OR REPLACE that
-- changes the returns-table signature. The function is owner-only via
-- the campground_admins ownership check; no other caller needs the old
-- signature, so dropping it is safe.
-- ----------------------------------------------------------------------------
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
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id, m.source, m.category, m.body, m.guest_contact, m.status, m.submitted_at,
    m.site_number, m.first_name, m.last_name, m.phone, m.email,
    m.preferred_contact_method, m.read_at, m.resolved_at
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

-- ----------------------------------------------------------------------------
-- New RPC: owner_set_message_status — mutate a single message's status.
--
-- SECURITY DEFINER + campground_admins ownership check so a non-owner
-- can't flip an arbitrary message. The function also stamps read_at /
-- resolved_at on the appropriate transitions and clears them on a
-- transition back. Returning the post-update row keeps the client UI
-- simple: optimistic update, replace with the server's view.
-- ----------------------------------------------------------------------------
create or replace function public.owner_set_message_status(
  _message_id uuid,
  _new_status text
)
returns table(
  id uuid,
  status text,
  read_at timestamptz,
  resolved_at timestamptz
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

-- ----------------------------------------------------------------------------
-- New RPC: owner_message_counts — unread + safety counts for the nav
-- badge. Single round-trip; safety count is a subset of unread so the
-- badge can render "8 (1 urgent)" without a second query.
-- ----------------------------------------------------------------------------
create or replace function public.owner_message_counts(
  _campground_id uuid
)
returns table(
  unread_total bigint,
  unread_safety bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where m.status = 'new') as unread_total,
    count(*) filter (where m.status = 'new' and m.category = 'safety_concern') as unread_safety
    from public.campground_messages m
   where m.campground_id = _campground_id
     and exists (
       select 1 from public.campground_admins ca
        where ca.campground_id = _campground_id
          and ca.user_id = auth.uid()
     );
$$;

revoke all on function public.owner_message_counts(uuid) from public;
grant execute on function public.owner_message_counts(uuid) to authenticated;

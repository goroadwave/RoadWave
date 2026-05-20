-- 0056_guest_message_thread_slug.sql
-- Add campground_slug to the guest_message_thread RPC output.
--
-- Why
-- ---
-- The /m/[id] camper thread page renders a "Back to campground page"
-- link. We try three paths in order: (1) the slug stored in the
-- camper's localStorage entry, (2) the slug returned by the RPC, (3)
-- the ?from=<slug> query param. Paths 1 and 3 already work for new
-- submissions (mig 0055 + commit afbda07). This migration adds path
-- 2 so legacy entries -- localStorage rows written before the slug
-- field existed, and any pre-existing owner-reply email links --
-- still get an accurate back-to-campground target after the camper
-- unlocks the thread.
--
-- What this migration does
-- ------------------------
-- Pure RPC reshape. The function's signature changes (one new output
-- column), so Postgres requires DROP FUNCTION before CREATE OR
-- REPLACE. Re-grants execute to anon + authenticated to match the
-- existing access surface from mig 0055.
--
-- What this migration does NOT do
-- -------------------------------
-- * No changes to campground_messages or campground_message_replies.
-- * No changes to the gate logic -- the same token + site + last
--   name match is enforced.
-- * No new grants. No new policies. No new tables.
-- * No data changes -- nothing is inserted, updated, or deleted.
-- * Stripe, billing, waves, discovery, public profiles, QR routing,
--   owner preview, QR print card -- all untouched.

drop function if exists public.guest_message_thread(uuid, text, text, text);

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
  campground_slug text,
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
      c.name as campground_name,
      c.slug as campground_slug
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
    m.campground_slug as campground_slug,
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

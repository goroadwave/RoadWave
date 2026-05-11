-- ============================================================================
-- 0039_engagement_hub.sql
-- Phase 2 of owner retention — the Guest Engagement Hub.
--
--   1. Per-feature on/off toggles on campgrounds for the four guest-side
--      surfaces: Review CTA, Book Again CTA, Contact the Office form,
--      and the Stay Feedback / Pulse Check. Default ON.
--
--   2. Booking customization fields: an optional owner-written message
--      and an optional promo code, both displayed alongside the
--      Book Again button when configured.
--
--   3. email_notifications_enabled flag — gates outgoing alert emails
--      for pulse-needs-attention and contact-message events. Default ON.
--
--   4. campground_messages table — append-only inbox for the new
--      structured contact form and "Something needs attention" pulse
--      follow-ups. RLS locked to service-role for writes; owner reads
--      go through the owner_messages_for_campground SECURITY DEFINER
--      RPC, which checks campground_admins membership.
--
--   5. campground_events check constraint extended to accept the three
--      pulse event types so the existing /api/campground/event logger
--      can count Great / Good / Needs Attention taps the same way it
--      already counts scans + clicks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Per-feature toggles + booking extras on the campgrounds row.
-- ----------------------------------------------------------------------------
alter table public.campgrounds
  add column if not exists feature_review_enabled boolean not null default true,
  add column if not exists feature_book_again_enabled boolean not null default true,
  add column if not exists feature_contact_office_enabled boolean not null default true,
  add column if not exists feature_pulse_check_enabled boolean not null default true,
  add column if not exists email_notifications_enabled boolean not null default true,
  add column if not exists booking_message text,
  add column if not exists booking_promo_code text;

-- ----------------------------------------------------------------------------
-- 2. campground_messages — structured guest-to-owner inbox.
-- ----------------------------------------------------------------------------
create table if not exists public.campground_messages (
  id uuid primary key default gen_random_uuid(),
  campground_id uuid not null references public.campgrounds(id) on delete cascade,
  -- Source distinguishes the contact form from the pulse-check
  -- follow-up so the owner can tell at a glance why a row exists.
  source text not null check (source in ('contact_form', 'pulse_needs_attention')),
  -- Category is one of the nine contact-form options for contact_form
  -- rows. For pulse_needs_attention it stays null.
  category text check (
    category is null or category in (
      'wifi',
      'laundry',
      'propane',
      'late_checkout',
      'maintenance',
      'quiet_hours',
      'local_recommendations',
      'activities',
      'general_question'
    )
  ),
  body text not null check (length(body) between 1 and 2000),
  -- Optional contact pointer the guest can leave so the owner can
  -- follow up. Free-form (email, phone, site number) — never required.
  guest_contact text check (guest_contact is null or length(guest_contact) <= 200),
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  request_ip text,
  submitted_at timestamptz not null default now()
);

create index if not exists campground_messages_campground_idx
  on public.campground_messages (campground_id, submitted_at desc);
create index if not exists campground_messages_status_idx
  on public.campground_messages (campground_id, status, submitted_at desc);

-- RLS enabled, no policies => service-role-only direct access. Owner
-- reads go through the RPC below.
alter table public.campground_messages enable row level security;

-- ----------------------------------------------------------------------------
-- 3. owner_messages_for_campground — owner-visible inbox feed.
-- ----------------------------------------------------------------------------
-- Returns the last N messages for a campground the caller administers.
-- Guarded by a campground_admins membership check on auth.uid().
-- Non-admins get an empty set (not an error) — matches the shape of
-- 0019's owner_active_checkin_count.
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
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.source, m.category, m.body, m.guest_contact, m.status, m.submitted_at
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
-- 4. Extend campground_events check constraint to allow pulse types.
-- ----------------------------------------------------------------------------
-- Postgres doesn't have a "alter check constraint" — drop and recreate.
-- Idempotent: works on rerun because the drop is `if exists` and the
-- add includes only the new shape.
alter table public.campground_events
  drop constraint if exists campground_events_event_type_check;

alter table public.campground_events
  add constraint campground_events_event_type_check
  check (event_type in (
    'qr_scan',
    'review_click',
    'book_again_click',
    'contact_message',
    'bulletin_view',
    'pulse_great',
    'pulse_good',
    'pulse_needs_attention'
  ));

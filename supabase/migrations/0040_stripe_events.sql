-- ============================================================================
-- 0040_stripe_events.sql
-- Idempotency table for the Stripe webhook handler.
--
-- Stripe retries webhooks (often within seconds) when a handler is slow or
-- when its own backend reconciles. Until now the webhook relied on a
-- per-handler "did we already do the side effect?" check (e.g. submission
-- status === 'provisioned' for checkout.session.completed), which works for
-- the provisioning step but doesn't protect against duplicate subscription
-- syncs or duplicate invoice.paid alerts.
--
-- This table is the canonical record of which Stripe event IDs we've already
-- processed. The webhook inserts (stripe_event_id, event_type) with
-- ON CONFLICT (stripe_event_id) DO NOTHING; if the insert reports zero
-- rows the event has been seen before and we return 200 without re-running
-- the side effects.
--
-- RLS is enabled with no policies — only the service-role key can read or
-- write this table. The webhook runs through the admin client.
-- ============================================================================

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists stripe_events_event_type_idx
  on public.stripe_events (event_type, processed_at desc);

alter table public.stripe_events enable row level security;

-- ----------------------------------------------------------------------------
-- Add fields to owner_signup_submissions for the /owners/start intake.
--
-- The Phase 3 intake form captures three Guest CTA links (Google Review URL,
-- Booking URL) and a six-checkbox "what do you want RoadWave to help with"
-- selection. Migration 0031 didn't include columns for those because the
-- form lived in a different table (campground_leads) at the time. Now that
-- /owners/start is the canonical self-serve signup, those values land here
-- where the webhook can read them when it provisions the campground row.
-- ----------------------------------------------------------------------------
alter table public.owner_signup_submissions
  add column if not exists booking_url text,
  add column if not exists review_url text,
  add column if not exists interests text[] not null default '{}';

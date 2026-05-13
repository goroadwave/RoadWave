-- Extend campground_events.event_type to cover check-in lifecycle.
--
-- Migration 0038 originally allowed:
--   qr_scan, review_click, book_again_click, contact_message, bulletin_view
--
-- Migration 0039 then extended that to also allow:
--   pulse_great, pulse_good, pulse_needs_attention
--
-- This migration adds:
--   check_in_started     — fired when checkInAction starts processing
--                          a token (the camper has tapped "Check in").
--   check_in_completed   — fired after the checkin_by_token RPC
--                          successfully writes the check_ins row.
--
-- The CHECK constraint is fully re-created so the final set is the
-- union of base + pulse + new. Additive only — no data migration.

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
    'pulse_needs_attention',
    'check_in_started',
    'check_in_completed'
  ));

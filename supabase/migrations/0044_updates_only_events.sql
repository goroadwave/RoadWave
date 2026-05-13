-- Extend campground_events.event_type to cover three more event names
-- surfaced by the Updates Only page + helpful-links section.
--
-- Builds on the constraint state from migrations 0038 / 0039 / 0041
-- (qr_scan, review_click, book_again_click, contact_message,
-- bulletin_view, pulse_great, pulse_good, pulse_needs_attention,
-- check_in_started, check_in_completed). The new types:
--
--   updates_only_view          — fires when an anon visitor loads
--                                 /campground/<slug>/updates. Distinct
--                                 from bulletin_view (which historically
--                                 also fires on the same page); kept
--                                 separately so the owner dashboard
--                                 can show "Updates Only visits" as a
--                                 first-class metric without polluting
--                                 the bulletin-engagement count.
--   campground_website_click   — Visit Website button on Updates Only.
--   office_contact_started     — Contact Office form opened (vs the
--                                 existing contact_message which only
--                                 fires on submit).
--
-- Additive only. No data migration. Existing rows keep their values.

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
    'check_in_completed',
    'updates_only_view',
    'campground_website_click',
    'office_contact_started'
  ));

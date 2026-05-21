-- 0060_campground_arrival_departure.sql
--
-- Owner-editable check-in / checkout times surfaced on every
-- camper-facing campground info surface (public QR landing, signed-in
-- hub, owner preview, and the campground-aware auth page).
--
-- Five optional text fields on public.campgrounds. All-text instead
-- of a strict time type because owners write things like "2:00 PM",
-- "After 1pm", "Flexible — call ahead". Cleaning that up at the DB
-- layer would lose useful nuance; the camper-side card just renders
-- the strings as-is.
--
-- Card visibility (camper side):
--   * Render the "Arrival & Departure" card when AT LEAST ONE of
--     check_in_time / check_out_time / arrival_departure_note is
--     non-empty. Empty values are hidden individually (no orphan
--     "Check-in:" label with no time after it).
--   * The two note fields (early_check_in_note, late_check_out_note)
--     are tied to their respective time fields -- they only render
--     when the time they describe also renders.
--
-- Owner side:
--   * The /owner/profile page edits these fields alongside the
--     existing Wi-Fi / Rules / Emergency surfaces. Same blank-to-null
--     normalization the existing fields use.
--
-- Pattern matches migration 0049 (guest hub sections): additive
-- columns, no row backfill, anon SELECT grants so a future
-- browser-side read path doesn't need a follow-up grant.
--
-- What this migration does NOT do:
--   * No new tables.
--   * No changes to RLS policies on campgrounds.
--   * No changes to existing rows.

alter table public.campgrounds
  add column if not exists check_in_time text,
  add column if not exists check_out_time text,
  add column if not exists early_check_in_note text,
  add column if not exists late_check_out_note text,
  add column if not exists arrival_departure_note text;

grant select (
  check_in_time, check_out_time,
  early_check_in_note, late_check_out_note,
  arrival_departure_note
) on public.campgrounds to anon;

comment on column public.campgrounds.check_in_time is
  'Owner-entered check-in time (e.g. "2:00 PM"). Free-form text so owners can write "After 1pm" or "Flexible — call ahead". Rendered as-is on camper-facing surfaces.';
comment on column public.campgrounds.check_out_time is
  'Owner-entered checkout time. Same shape as check_in_time.';
comment on column public.campgrounds.early_check_in_note is
  'Optional owner-facing note about early check-in. Only renders alongside check_in_time when both are set.';
comment on column public.campgrounds.late_check_out_note is
  'Optional owner-facing note about late checkout. Only renders alongside check_out_time when both are set.';
comment on column public.campgrounds.arrival_departure_note is
  'Free-form note covering both arrival and departure (e.g. "Office closes at 9pm — use after-hours envelope").';

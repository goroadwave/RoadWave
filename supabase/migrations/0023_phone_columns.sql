-- ============================================================================
-- 0023_phone_columns.sql
-- Adds an optional phone column to two tables:
--   * campground_leads — written by /api/campground-lead when an owner
--     submits "Set this up for my campground".
--   * demo_pages — written by /api/demo when a self-serve demo is saved.
--
-- public.campgrounds already has a phone column (added in 0009), so the
-- owner signup + setup paths just write to that existing column.
--
-- Loose length-only validation (60 chars) so any reasonable international
-- format passes — we don't try to be a phone-number validator.
-- ============================================================================

alter table public.campground_leads
  add column if not exists phone text
    check (phone is null or char_length(phone) <= 60);

alter table public.demo_pages
  add column if not exists phone text
    check (phone is null or char_length(phone) <= 60);

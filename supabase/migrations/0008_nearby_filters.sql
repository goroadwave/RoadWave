-- ============================================================================
-- 0008_nearby_filters.sql
-- Adds two array columns to profiles so the Nearby page filter selections
-- (travel styles + interest slugs) persist across sessions. Empty arrays
-- mean "no filter applied" (the "All" state). Existing profiles_update_own
-- RLS already lets the authenticated user write their own row, so no new
-- policies needed.
-- ============================================================================

alter table public.profiles
  add column if not exists nearby_filter_styles text[] not null default '{}',
  add column if not exists nearby_filter_interests text[] not null default '{}';

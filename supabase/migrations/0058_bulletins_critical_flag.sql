-- 0058_bulletins_critical_flag.sql
-- Phase 3c prerequisite. Adds one column to public.bulletins so an
-- owner can elevate an existing bulletin to a "critical / severe
-- weather" notice. Deliberately minimal -- per the Phase 3 spec, we
-- reuse the existing bulletin structure (category, expires_at,
-- message, created_at, from mig 0009) instead of introducing a
-- separate critical_notices table + workflow.
--
-- Column
-- ------
--   is_critical boolean not null default false
--     -- When true, the camper QR page renders this bulletin at the
--     -- very top with strong red styling AND triggers the Lantern
--     -- (Phase 3b) to pulse. The bulletin remains "pinned" at the
--     -- top until its existing expires_at fires OR the owner toggles
--     -- is_critical back to false. Non-critical bulletins continue
--     -- to render in the normal "Campground announcements" list with
--     -- existing category-based styling.
--
-- Why is_critical instead of a new category value
-- -----------------------------------------------
-- The existing bulletin_category enum (event / special / alert /
-- general) describes WHAT a bulletin is about. is_critical describes
-- HOW prominently it should be displayed. They're orthogonal -- an
-- "alert"-category bulletin might be a minor heads-up ("wifi router
-- reboot at 3am") that doesn't deserve the top-of-page pin, while a
-- "general"-category bulletin might be the most important thing on
-- the page right now ("water main repair, no water 2-4pm"). Keeping
-- them separate lets the owner pick category for taxonomy and toggle
-- is_critical for prominence.
--
-- Index
-- -----
-- Partial index on critical bulletins so the camper poll endpoint
-- (Phase 3a) can find the active one cheaply without scanning the
-- whole table. NOTE: the WHERE predicate intentionally does NOT
-- include `expires_at > now()` -- partial-index predicates must use
-- immutable expressions only, and now() is STABLE. Expired-critical
-- rows are filtered at query time.
--
-- "Most recent wins" policy
-- -------------------------
-- If an owner has multiple is_critical=true bulletins active at the
-- same time, only the most recently created non-expired one renders
-- at the top. Older active criticals still render in the normal
-- bulletin list. Acceptable trade-off vs. enforcing a one-at-a-time
-- constraint (which would create awkward edge cases when an owner
-- wants to update an active notice).
--
-- What this migration does NOT do
-- -------------------------------
--   * No new tables.
--   * No new RPCs.
--   * No new grants.
--   * No changes to RLS / existing bulletin queries / existing
--     bulletins_owner_all + bulletins_anon_read policies.
--   * No data writes -- pure additive DDL.
--   * Nothing touched in Stripe, billing, waves, discovery, public
--     profiles, QR routing, owner preview, owner messages, the
--     private reply flow, or the QR print card.

alter table public.bulletins
  add column if not exists is_critical boolean not null default false;

create index if not exists bulletins_critical_idx
  on public.bulletins (campground_id, created_at desc)
  where is_critical = true;

comment on column public.bulletins.is_critical is
  'When true, this bulletin renders at the very top of the camper QR page with strong red styling (severe weather / evacuation / shelter-in-place / etc.) and triggers the Lantern (Phase 3b) to pulse. Stays pinned until expires_at OR the owner toggles this off. Most recent active is_critical bulletin renders at top; older active criticals stay in the normal bulletin list.';

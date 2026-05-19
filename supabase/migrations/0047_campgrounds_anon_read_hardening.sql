-- ============================================================================
-- 0047_campgrounds_anon_read_hardening.sql
-- Tightens anonymous-role visibility on public.campgrounds.
--
-- Background
-- ----------
-- Migration 0001 declared `campgrounds_select` as `using (true)` for any
-- role. With Supabase's public anon key embedded in every browser
-- bundle, that allowed an unauthenticated SELECT to return every row
-- and every column — including archived test rows, owner_email,
-- stripe_customer_id, billing-state fields, and internal email-tracking
-- timestamps. Tracked as GitHub issue #1 (severity moderate, not a
-- launch blocker because no real owner PII exists yet and write paths
-- are protected by server-action ownership checks).
--
-- What this migration does
-- ------------------------
--   (a) Row-level: anon sees only is_active=true rows. Authenticated
--       users see active rows broadly. Owners additionally see their
--       own row regardless of is_active (existing policy from 0012).
--       Super_admins (profiles.is_admin = true) see everything.
--   (b) Column-level: anon's SELECT is narrowed to a hand-picked list
--       of public-facing columns. Billing, Stripe, PII, and internal
--       email-tracking columns are no longer readable by anon at all.
--
-- The service_role client (used by the /campground/[slug] welcome
-- page, the Stripe webhook handler, /admin pages that use the admin
-- client directly, and the owner logo upload action) bypasses BOTH
-- layers. The authed cookie session (owner dashboard, admin UI
-- routed through requireAdmin) keeps full column visibility, gated
-- only by row-level policies.
--
-- What this migration does NOT do
-- -------------------------------
--   * No DELETE, no UPDATE, no DROP TABLE — pure DDL.
--   * No changes to existing rows.
--   * No changes to Stripe configuration, prices, webhooks, env vars,
--     or customer records (the migration doesn't touch any of those
--     surfaces — they live in Stripe and in Vercel, not in this DB).
--   * No changes to RLS on other tables.
--   * No changes to UPDATE / INSERT / DELETE policies on campgrounds —
--     campgrounds_update_owner (migration 0012) remains the
--     authoritative gate for owner-driven writes.
--
-- After this lands
-- ----------------
-- Flip test.fixme back to test in tests/qa/rls-anon-reads.test.js for
-- the "anon CAN read campgrounds (is_active=true rows only)" assertion.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop the wide-open SELECT policy declared in 0001.
-- ----------------------------------------------------------------------------
drop policy if exists campgrounds_select on public.campgrounds;

-- ----------------------------------------------------------------------------
-- 2. Anon role: SELECT only is_active=true rows.
-- ----------------------------------------------------------------------------
drop policy if exists campgrounds_select_anon on public.campgrounds;
create policy campgrounds_select_anon
  on public.campgrounds for select
  to anon
  using (is_active = true);

-- ----------------------------------------------------------------------------
-- 3. Authenticated users: SELECT is_active=true rows broadly. The
--    existing campgrounds_select_owner policy (migration 0012) gives
--    an owner additional access to their own row when is_active=false.
--    PostgreSQL combines RLS policies with OR semantics, so the two
--    compose: owners see (active OR own row); other authed users see
--    (active only).
-- ----------------------------------------------------------------------------
drop policy if exists campgrounds_select_authed_active on public.campgrounds;
create policy campgrounds_select_authed_active
  on public.campgrounds for select
  to authenticated
  using (is_active = true);

-- ----------------------------------------------------------------------------
-- 4. Super_admins (profiles.is_admin = true) SELECT every row.
--    Required because /admin/campgrounds/page.tsx reads campgrounds
--    via the authed cookie session returned by requireAdmin() (not
--    the service-role client). Without this policy the admin tool
--    would only see what the admin user personally owns.
-- ----------------------------------------------------------------------------
drop policy if exists campgrounds_select_admin on public.campgrounds;
create policy campgrounds_select_admin
  on public.campgrounds for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid())
         and p.is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Column-level grants: anon may SELECT only the columns a public
--    visitor legitimately needs to render the welcome page and the
--    /updates guest hub. Billing, Stripe, PII, and internal
--    email-tracking columns are off-limits to anon.
--
--    Service_role and authenticated retain full SELECT on every
--    column — column-level GRANT/REVOKE is per-role and these two
--    roles are not in the GRANT below.
--
--    Any future column added to public.campgrounds will default to
--    "not granted to anon" until explicitly added to this list. That
--    is the correct default for a security-sensitive table.
-- ----------------------------------------------------------------------------
revoke select on public.campgrounds from anon;
grant select (
  -- identity
  id, slug, name,
  -- location
  city, region, address, lat, lon, timezone,
  -- contact (already shown on the public welcome page)
  phone, website,
  -- brand
  logo_url, is_verified,
  -- amenities + their owner-written sub-notes
  amenities, amenity_notes,
  -- visibility flag (always true for the rows anon can see)
  is_active,
  -- engagement hub
  google_review_url, booking_url, booking_message, booking_promo_code,
  -- feature toggles
  feature_review_enabled, feature_book_again_enabled,
  feature_contact_office_enabled, feature_pulse_check_enabled,
  -- timestamps
  created_at
) on public.campgrounds to anon;

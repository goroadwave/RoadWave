-- Forward-compatibility migration for Supabase's Data API permission
-- changes (May 30, 2026 for new projects; Oct 30, 2026 for existing
-- projects). After those cutoffs, NEW tables in the public schema
-- will not be exposed to PostgREST automatically — explicit GRANT
-- statements are required.
--
-- This migration:
--   1. Explicitly grants the minimum table-level privileges each
--      PostgREST role (anon, authenticated, service_role) needs to
--      keep RoadWave's current flows working.
--   2. Does NOT modify any RLS policy. Row-level security remains
--      the authoritative filter; this migration only ensures the
--      table-level GRANT layer permits PostgREST to even attempt
--      the operation.
--   3. Does NOT REVOKE any existing implicit grant. Implicit grants
--      stay until Supabase's cutoff removes them; from that point
--      onward only these explicit grants remain.
--   4. Establishes default privileges so newly-created tables in
--      the public schema get service_role access automatically;
--      anon/authenticated still need explicit per-table grants in
--      each new migration, which is the intended per-table-review
--      pattern going forward.
--
-- Idempotent. Safe to re-run.

-- ----------------------------------------------------------------------------
-- 1. Schema-level USAGE (defensive — usually already granted by Supabase).
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Camper/owner-accessible tables (15)
--
-- Each grant is the minimum the source code requires; RLS policies
-- filter which rows the user can read or mutate. Anon does NOT get
-- any of these — every anon-side flow in the app goes through the
-- admin client (service_role) or the Supabase Auth API, not the
-- Data API directly.
-- ----------------------------------------------------------------------------

-- profiles: own + visible nearby reads, profile-setup updates, trigger inserts
grant select, insert, update on table public.profiles to authenticated;

-- profile_interests: own chip toggles
grant select, insert, delete on table public.profile_interests to authenticated;

-- interests: read-only catalog. No INSERT — no user-suggested interests today.
grant select on table public.interests to authenticated;

-- campgrounds: owners update own (RLS-gated); campers SELECT for
-- "Checked in at X" surfaces. INSERT/DELETE all go through admin
-- client (owner setup + admin tools).
grant select, update on table public.campgrounds to authenticated;

-- campground_admins: read-only via RLS-aware client (auth gates +
-- ownership lookups). Writes all go through admin client.
grant select on table public.campground_admins to authenticated;

grant select, insert, update, delete on table public.check_ins to authenticated;
grant select, insert, update on table public.waves to authenticated;
grant select on table public.crossed_paths to authenticated;
grant select, insert on table public.crossed_paths_messages to authenticated;
grant select, insert, update, delete on table public.meetups to authenticated;
grant select, insert, update, delete on table public.bulletins to authenticated;
grant select, insert on table public.legal_acks to authenticated;

-- reports: camper submits via RLS-aware client (insert); admin reads
-- via RLS-aware client filtered by is_admin() policy (select). No
-- end-user UPDATE or DELETE — admin moderation goes through the
-- admin client, which is service_role and bypasses these grants.
grant select, insert on table public.reports to authenticated;

-- notifications: lantern reads own + mark-read updates is_read
grant select, update on table public.notifications to authenticated;

-- admin_audit_log: admins write + read via RLS-aware client; the
-- table's RLS policy filters to is_admin() = true so non-admins see
-- nothing even with this grant.
grant select, insert on table public.admin_audit_log to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Service-role-only tables (9)
--
-- These are RLS-locked with NO policies. Even with implicit Supabase
-- grants today, anon and authenticated can't read or write them
-- because RLS rejects every row. Post-Oct-30 they'll lose their
-- implicit grants too — and this migration deliberately does NOT
-- re-grant them. Result: doubly-protected from the Data API for
-- anon/authenticated. service_role accesses them in step 4 below.
--
--   campground_qr_tokens     — QR tokens are server-secret
--   campground_leads         — public POST via /api/campground-lead
--   campground_requests      — public POST via /api/campground-request
--   account_deletions        — compliance log
--   demo_pages               — wizard-built; admin client read
--   owner_signup_submissions — Stripe webhook + admin inbox
--   campground_events        — server-side append-only event log
--   campground_messages      — pulse + contact-office messages
--   stripe_events            — Stripe webhook idempotency log
--
-- (No statements here — service_role ALL is granted globally below.)

-- ----------------------------------------------------------------------------
-- 4. service_role: ALL on every table.
--
-- service_role bypasses RLS regardless, but explicit grants future-
-- proof against the Oct 30 implicit-grant removal.
-- ----------------------------------------------------------------------------
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ----------------------------------------------------------------------------
-- 5. Default privileges for FUTURE tables.
--
-- Without these, every new migration that does CREATE TABLE has to
-- remember to grant service_role. Default privileges ensure
-- service_role always gets access on tables created by the role
-- running migrations.
--
-- anon and authenticated are intentionally NOT included in defaults
-- — every new table should grant exactly what its access pattern
-- needs, and that decision lives in the table's own migration.
-- ----------------------------------------------------------------------------
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;

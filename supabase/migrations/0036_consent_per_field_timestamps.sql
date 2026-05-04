-- ============================================================================
-- 0036_consent_per_field_timestamps.sql
-- Per-field consent timestamps on legal_acks. Adds four nullable timestamptz
-- columns so each consent flag carries its own when-it-was-given moment,
-- alongside the existing version columns + the row-level accepted_at.
--
-- The original schema (booleans + a single accepted_at) captured the same
-- intent — every consent on a signup row is given simultaneously when the
-- user submits the form — but the per-field shape makes audit + compliance
-- queries unambiguous.
--
-- The booleans (age_confirmed / accepted_terms / accepted_rules) stay in
-- place for back-compat with anything still reading them; new code writes
-- both the booleans and the per-field timestamps.
-- ============================================================================

alter table public.legal_acks
  add column if not exists confirmed_18_at timestamptz,
  add column if not exists accepted_terms_at timestamptz,
  add column if not exists accepted_privacy_at timestamptz,
  add column if not exists accepted_community_rules_at timestamptz;

-- Back-fill existing rows. Every consent on a row was given at the same
-- moment (the original signup), so accepted_at is the right value for all
-- four. Idempotent: running this twice is a no-op for already-populated
-- rows because of the coalesce().
update public.legal_acks
   set confirmed_18_at = coalesce(confirmed_18_at, accepted_at),
       accepted_terms_at = coalesce(accepted_terms_at, accepted_at),
       accepted_privacy_at = coalesce(accepted_privacy_at, accepted_at),
       accepted_community_rules_at = coalesce(accepted_community_rules_at, accepted_at)
 where accepted_at is not null;

-- ============================================================================
-- 0024_signup_consent_fields.sql
-- Adds explicit consent flags to legal_acks so each signup row carries the
-- exact compliance shape the new policy doc expects:
--   age_confirmed, accepted_terms, accepted_rules
--
-- These are recorded alongside the existing version columns
-- (terms_version, privacy_version, community_rules_version) and
-- accepted_at, plus the request metadata. All nullable for back-compat
-- with rows written before this migration.
-- ============================================================================

alter table public.legal_acks
  add column if not exists age_confirmed boolean,
  add column if not exists accepted_terms boolean,
  add column if not exists accepted_rules boolean;

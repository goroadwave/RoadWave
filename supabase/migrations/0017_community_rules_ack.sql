-- ============================================================================
-- 0017_community_rules_ack.sql
-- Adds community_rules_version to legal_acks so guest signups can record
-- acceptance of the Community Rules / Code of Conduct alongside the general
-- Terms + Privacy versions. Nullable: owner-side acks (which use
-- partner_terms_version instead) continue inserting NULL here, and the
-- existing index on user_id + accepted_at is unaffected.
-- ============================================================================

alter table public.legal_acks
  add column if not exists community_rules_version text;

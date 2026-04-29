-- ============================================================================
-- 0016_partner_terms_ack.sql
-- Adds partner_terms_version to legal_acks so owner signups can record
-- acceptance of the Campground Partner Terms alongside the general Terms +
-- Privacy versions. Nullable: guest signups continue inserting NULL here
-- (they don't see partner terms), and the existing index on user_id +
-- accepted_at is unaffected.
-- ============================================================================

alter table public.legal_acks
  add column if not exists partner_terms_version text;

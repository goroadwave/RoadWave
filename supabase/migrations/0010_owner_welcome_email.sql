-- ============================================================================
-- 0010_owner_welcome_email.sql
-- Tracks when the owner welcome email was sent so we only send it once.
-- The action that sends the email also stamps this column.
-- ============================================================================

alter table public.campgrounds
  add column if not exists welcome_email_sent_at timestamptz;

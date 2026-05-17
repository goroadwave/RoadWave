-- Bring the campgrounds.trial_ends_at default in line with the rest of
-- the product. Migration 0031 set the default to now() + 14 days, but
-- every product surface (Stripe Checkout, the post-Checkout DB write
-- in the webhook handler, all marketing/email copy, the post-OAuth
-- /owner/setup action, and the manual /owner/profile recovery action)
-- now uses 30 days. The 14-day default leaked through to any code path
-- that inserted a campground row without explicitly setting
-- trial_ends_at, which produced inconsistent owner experiences.
--
-- This migration changes ONLY the column default for NEW inserts. It
-- intentionally does NOT update existing rows: pre-launch test rows
-- may have been provisioned under prior code, and a blanket UPDATE
-- could either shorten a trial Stripe is tracking on its side, or
-- extend a trial the owner has already agreed to end. If you want to
-- backfill specific rows, do it case-by-case from the admin tools.
--
-- Backwards compatible: no schema rewrite, no column rename, just the
-- DEFAULT clause changes. Triggers, RLS, indexes, and reads are
-- unaffected.

alter table public.campgrounds
  alter column trial_ends_at
  set default (now() + interval '30 days');

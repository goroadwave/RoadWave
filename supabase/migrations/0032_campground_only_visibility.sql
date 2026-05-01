-- ============================================================================
-- 0032_campground_only_visibility.sql
-- Part 1 of 2: add the new privacy_mode enum value ON ITS OWN.
--
-- Postgres requires `ALTER TYPE … ADD VALUE` to be committed before any
-- subsequent statement can reference the new value (function bodies,
-- CHECK constraints, etc.). The Supabase SQL Editor wraps a single
-- run in an implicit transaction, so we split the rollout into two
-- migration files: this one adds the value and commits, and
-- 0033_campground_only_columns_and_rpcs.sql adds the columns, the
-- RLS update, and the RPCs that actually use it.
-- ============================================================================

alter type public.privacy_mode add value if not exists 'campground_only';

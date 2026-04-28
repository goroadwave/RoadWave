-- ============================================================================
-- 0011_fix_owner_enum.sql
-- Adds 'owner' to the campground_role enum if it isn't there yet.
--
-- Why this exists: 0009 wrapped this same statement in a DO $$ ... $$ block
-- with an exception handler. DO blocks always run inside a transaction,
-- and Postgres explicitly forbids ALTER TYPE ... ADD VALUE inside a
-- transaction block. The error was caught + swallowed by the exception
-- handler, so the migration appeared to succeed but the enum value never
-- got added. That's what caused owner signup to fail at the
-- campground_admins.insert({ role: 'owner' }) step with:
--   invalid input value for enum campground_role: "owner"
--
-- This file is the only statement, no DO wrap, no transaction. Postgres
-- will commit it immediately, and IF NOT EXISTS makes it idempotent so
-- it's safe to re-run.
-- ============================================================================

alter type public.campground_role add value if not exists 'owner';

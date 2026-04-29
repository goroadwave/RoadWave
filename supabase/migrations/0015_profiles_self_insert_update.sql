-- ============================================================================
-- 0015_profiles_self_insert_update.sql
-- Re-asserts the RLS policies that let an authenticated user write their
-- own profile row. Without these, save flows like avatar upload, profile
-- editor, and onboarding modal hit "new row violates row-level security
-- policy" because the UPDATE/INSERT lacks a permitting policy.
--
-- Both policies key on `id = auth.uid()` so a user can only touch their
-- own row. Idempotent: drop-if-exists before each create — safe to re-run
-- against a DB that already has the policies from 0001_init.sql.
-- ============================================================================

-- INSERT: typically the auth trigger creates the row, but if a row is
-- somehow missing (older accounts, trigger disabled, etc.) the
-- application falls back to insert-then-update, and that path needs an
-- explicit policy.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

-- UPDATE: lets the user save changes to their own profile (display name,
-- avatar, sharing toggles, role-on-onboarding, etc.).
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

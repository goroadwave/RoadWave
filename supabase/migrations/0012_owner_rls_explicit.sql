-- ============================================================================
-- 0012_owner_rls_explicit.sql
-- Explicit, simple RLS policies for owners reading their own campground
-- and the link row that connects them. Replaces the equivalents from
-- 0009 in case those didn't apply cleanly. Idempotent — drop if exists
-- before each create. Safe to re-run.
--
-- The campground_admins policy was previously a self-referential OR
-- (allowed seeing rows where you ARE the user, OR rows for any campground
-- you admin). The recursive sub-EXISTS reads the same table that's being
-- protected, which Postgres allows but can have surprising results
-- depending on plan caching. Simplifying to user_id = auth.uid() is
-- enough for every code path the dashboard uses.
-- ============================================================================

-- 1) campground_admins: user can SELECT their own admin rows. -----------
drop policy if exists campground_admins_select_self on public.campground_admins;
create policy campground_admins_select_self
  on public.campground_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

-- 2) campgrounds: user can SELECT a campground if they admin it. --------
-- The sub-query against campground_admins is fine because policy #1
-- restricts that table to the user's own rows, so the EXISTS only
-- matches when there's a row where user_id = auth.uid() AND the
-- campground_id matches.
drop policy if exists campgrounds_select_owner on public.campgrounds;
create policy campgrounds_select_owner
  on public.campgrounds for select
  to authenticated
  using (
    exists (
      select 1
        from public.campground_admins ca
       where ca.campground_id = id
         and ca.user_id = (select auth.uid())
    )
  );

-- 3) campgrounds: user can UPDATE their own campground. -----------------
drop policy if exists campgrounds_update_owner on public.campgrounds;
create policy campgrounds_update_owner
  on public.campgrounds for update
  to authenticated
  using (
    exists (
      select 1
        from public.campground_admins ca
       where ca.campground_id = id
         and ca.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
        from public.campground_admins ca
       where ca.campground_id = id
         and ca.user_id = (select auth.uid())
    )
  );

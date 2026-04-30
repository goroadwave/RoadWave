-- ============================================================================
-- 0029_fix_admin_rls_recursion.sql
-- Replaces inline `exists (select … from profiles …)` checks in every
-- admin policy with a SECURITY DEFINER helper public.is_admin(). The
-- old pattern (introduced in 0027) caused infinite recursion when
-- Postgres evaluated profiles_select_admin while reading profiles to
-- check admin status in any other policy:
--
--   campgrounds_admin_update
--     → exists (select 1 from profiles where id = auth.uid() and is_admin = true)
--       → reading profiles fires profiles_select_admin
--         → which queries profiles
--           → which fires profiles_select_admin
--             → ∞
--
-- The helper bypasses RLS via SECURITY DEFINER, so it never triggers
-- the recursive policy lookup. All admin policies now route through
-- it. Access semantics are unchanged: same admins get the same access,
-- non-admins still get nothing.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- profiles: the recursive policy. Must be rewritten before any other
-- table's policy queries profiles through it.
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- admin_audit_log
-- ----------------------------------------------------------------------------
drop policy if exists admin_audit_log_admin_select on public.admin_audit_log;
create policy admin_audit_log_admin_select
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

drop policy if exists admin_audit_log_admin_insert on public.admin_audit_log;
create policy admin_audit_log_admin_insert
  on public.admin_audit_log for insert
  to authenticated
  with check (
    admin_id = (select auth.uid())
    and public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- campground_leads
-- ----------------------------------------------------------------------------
drop policy if exists campground_leads_admin_select on public.campground_leads;
create policy campground_leads_admin_select
  on public.campground_leads for select
  to authenticated
  using (public.is_admin());

drop policy if exists campground_leads_admin_update on public.campground_leads;
create policy campground_leads_admin_update
  on public.campground_leads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- campground_requests
-- ----------------------------------------------------------------------------
drop policy if exists campground_requests_admin_select on public.campground_requests;
create policy campground_requests_admin_select
  on public.campground_requests for select
  to authenticated
  using (public.is_admin());

drop policy if exists campground_requests_admin_update on public.campground_requests;
create policy campground_requests_admin_update
  on public.campground_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- reports
-- ----------------------------------------------------------------------------
drop policy if exists reports_admin_select on public.reports;
create policy reports_admin_select
  on public.reports for select
  to authenticated
  using (public.is_admin());

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- campgrounds (admin UPDATE only — the existing public SELECT policy
-- is unchanged).
-- ----------------------------------------------------------------------------
drop policy if exists campgrounds_admin_update on public.campgrounds;
create policy campgrounds_admin_update
  on public.campgrounds for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

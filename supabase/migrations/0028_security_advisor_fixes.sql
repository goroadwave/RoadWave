-- ============================================================================
-- 0028_security_advisor_fixes.sql
-- Addresses two high-priority Supabase Security Advisor categories:
--
-- 1. PUBLIC BUCKET ALLOWS LISTING — the avatars, campground-logos, and
--    demo-logos buckets each have an explicit SELECT policy on
--    storage.objects (added in 0005/0021, 0009, and 0022 respectively)
--    that allows anon to enumerate every uploaded filename. The bucket's
--    `public:true` flag is what makes individual object URLs work —
--    that flag goes through the storage proxy, NOT through RLS. So
--    dropping the SELECT-on-storage.objects policy stops listing
--    without breaking image rendering: getPublicUrl() URLs still work,
--    but `select name from storage.objects where bucket_id = '…'`
--    returns nothing for anon.
--
-- 2. PUBLIC CAN EXECUTE SECURITY DEFINER FUNCTIONS — defensively
--    re-applies the REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO
--    authenticated on every SECURITY DEFINER RPC that's intended to
--    be client-callable. The earlier migrations already did this; this
--    block makes the desired ACL state explicit in case of any drift.
--
-- Trigger-only SECURITY DEFINER functions (handle_new_user,
-- try_create_crossed_path, notify_*) are deliberately NOT granted to
-- anyone — they're invoked by the database trigger machinery only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Storage: remove the public-listing SELECT policies.
-- ----------------------------------------------------------------------------

-- avatars: drops the policy added in 0021 (and re-asserted from 0005).
drop policy if exists "anyone_read_avatars" on storage.objects;

-- campground-logos: drops the policy added in 0009.
drop policy if exists campground_logos_select on storage.objects;

-- demo-logos: drops the policy added in 0022.
drop policy if exists "anyone_read_demo_logos" on storage.objects;

-- The buckets themselves keep `public:true` so getPublicUrl() URLs
-- continue to render. Listing now requires service_role.

-- ----------------------------------------------------------------------------
-- 2. Defensive re-grant on every client-callable SECURITY DEFINER RPC.
--    Idempotent — these statements only enforce the same state our
--    earlier migrations already declared.
-- ----------------------------------------------------------------------------

revoke all on function public.preview_campground_by_token(uuid) from public;
grant execute on function public.preview_campground_by_token(uuid) to authenticated;

revoke all on function public.checkin_by_token(uuid) from public;
grant execute on function public.checkin_by_token(uuid) to authenticated;

revoke all on function public.nearby_campers(uuid) from public;
grant execute on function public.nearby_campers(uuid) to authenticated;

revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;

revoke all on function public.wave_consent(uuid, boolean) from public;
grant execute on function public.wave_consent(uuid, boolean) to authenticated;

revoke all on function public.decline_wave(uuid) from public;
grant execute on function public.decline_wave(uuid) to authenticated;

revoke all on function public.incoming_wave(uuid) from public;
grant execute on function public.incoming_wave(uuid) to authenticated;

revoke all on function public.pending_consent_summary(uuid) from public;
grant execute on function public.pending_consent_summary(uuid) to authenticated;

revoke all on function public.admin_activity_summary() from public;
grant execute on function public.admin_activity_summary() to authenticated;

revoke all on function public.admin_user_overview() from public;
grant execute on function public.admin_user_overview() to authenticated;

revoke all on function public.admin_signups_30d() from public;
grant execute on function public.admin_signups_30d() to authenticated;

revoke all on function public.admin_signup_provider_split() from public;
grant execute on function public.admin_signup_provider_split() to authenticated;

-- username_available stays callable by anon (signup form runs before
-- the user has a session). It is a SECURITY INVOKER (default) function,
-- not SECURITY DEFINER, and only does a name-format + uniqueness check.
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

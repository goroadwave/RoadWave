-- ============================================================================
-- 0030_avatars_select_own.sql
-- Restores avatar uploads, which broke after migration 0028 dropped the
-- broad "anyone_read_avatars" SELECT policy.
--
-- Why upload broke:
--   supabase.storage.upload(path, file, { upsert: true }) performs a
--   SELECT against storage.objects to decide INSERT vs UPDATE. Without
--   any SELECT policy on the avatars bucket, that precheck returns
--   nothing and the SDK falls back to INSERT-only behavior, which then
--   conflicts on re-upload (and can fail in subtler ways on first
--   upload depending on storage internals).
--
-- The fix is scoped: each authenticated user can SELECT only objects
-- whose `name` starts with their own auth.uid(), matching the existing
-- INSERT / UPDATE / DELETE policies' `name like '<uid>.%'` pattern from
-- migrations 0005 + 0021. So:
--   * anon listing of every avatar filename: still blocked
--   * authenticated reading another user's avatar row: still blocked
--   * upload + re-upload of one's own avatar: works again
--   * <img src="public-url"> rendering: unaffected (public:true on the
--     bucket serves URLs via the storage proxy, not RLS)
-- ============================================================================

drop policy if exists "users_read_own_avatar" on storage.objects;
create policy "users_read_own_avatar"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  );

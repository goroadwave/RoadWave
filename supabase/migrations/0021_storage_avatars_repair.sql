-- ============================================================================
-- 0021_storage_avatars_repair.sql
-- Re-asserts the storage RLS policies for the 'avatars' bucket. These were
-- originally added in 0005, but production was returning 400 on uploads —
-- likely a stale or partially-applied policy state. This migration is
-- idempotent (drop-if-exists before each create), safe to re-run, and uses
-- the same policy names as 0005 so reverting is just a re-apply.
--
-- The bucket itself was already correct on inspection (public read, 5 MB
-- cap, image-only mimetypes); we don't touch the bucket row to avoid
-- surprising config drift.
-- ============================================================================

-- INSERT — authenticated users can upload to a path that starts with
-- their auth.uid(). Filename convention: <user_uuid>.<ext>.
drop policy if exists "users_upload_own_avatar" on storage.objects;
create policy "users_upload_own_avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  );

-- UPDATE — needed because the upload call uses upsert: true. Without an
-- UPDATE policy, re-uploading (same filename) hits 400 because the
-- service can't UPDATE the existing row.
drop policy if exists "users_update_own_avatar" on storage.objects;
create policy "users_update_own_avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  )
  with check (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  );

-- DELETE — for deletion paths (e.g. account deletion's storage cleanup).
drop policy if exists "users_delete_own_avatar" on storage.objects;
create policy "users_delete_own_avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like ((select auth.uid()::text) || '.%')
  );

-- SELECT — the bucket is public:true so anonymous reads work, but having
-- an explicit SELECT policy for storage.objects is good hygiene for
-- avatars specifically (some Supabase deployments require it).
drop policy if exists "anyone_read_avatars" on storage.objects;
create policy "anyone_read_avatars"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

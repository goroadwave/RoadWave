-- 0051_campground_park_map_upload.sql
-- Phase 3b: Park Map Upload.
--
-- Background
-- ----------
-- Migration 0048 added URL-only Park Map support (show_park_map +
-- park_map_url + park_map_notes). Owners had to host the file
-- somewhere else (Google Drive, Imgur, Dropbox public link, their
-- own website) and paste the URL. Phase 3b lets the owner upload a
-- file directly from the Profile page; the existing URL field stays
-- as a fallback for owners who would rather paste a link.
--
-- What this migration does
-- ------------------------
--   (a) Adds four additive nullable columns to public.campgrounds:
--         park_map_path        text       -- public Supabase Storage URL
--                                           (with ?v=<ts> cache buster).
--                                           Misnomer-name retained for
--                                           consistency with the
--                                           pre-applied production
--                                           schema; semantically this
--                                           is a full URL, like logo_url.
--         park_map_file_type   text       -- MIME type of the uploaded
--                                           file. One of image/png,
--                                           image/jpeg, image/webp,
--                                           application/pdf.
--         park_map_file_name   text       -- original filename
--                                           ("Pinecrest-sites-2026.pdf")
--                                           for owner-side display only;
--                                           never shown to guests.
--         park_map_updated_at  timestamptz -- last upload time. Useful
--                                           in the owner UI to show
--                                           "uploaded 2 days ago" and
--                                           for future cache-busting if
--                                           the URL convention changes.
--
--   (b) Creates the campground-maps Supabase Storage bucket
--       (public read, server-mediated writes). The bucket is PUBLIC
--       so the rendered <img>/<a> URLs work for anon guests without
--       signed URLs. Matches the existing campground-logos pattern.
--
--   (c) Adds the four new columns to anon's column-level SELECT
--       allow-list from migration 0047. Without this, anon
--       PostgREST queries would see null for the columns.
--
-- Why a NEW column (park_map_path) instead of overwriting park_map_url
-- -------------------------------------------------------------------
-- Keeps URL-only mode intact. Owners who pasted a Google Drive link
-- under migration 0048 keep working with zero migration. Render rule
-- on the guest hub is:
--     uploaded_file ?? park_map_url ?? null
-- so the uploaded file wins when both are set, and the URL is the
-- fallback when no file is uploaded.
--
-- Storage RLS
-- -----------
-- The bucket is public-read. Writes route through the
-- uploadParkMapAction server action, which:
--   1. authenticates the caller via the cookie session,
--   2. confirms the caller has a campground_admins link to the
--      campgroundId being modified,
--   3. uploads via the service-role admin client (bypasses
--      storage RLS).
-- This mirrors the hardened logo-upload pattern that replaced the
-- browser-direct-to-Storage approach we abandoned because the
-- storage.objects RLS policy was fragile for the owner role
-- context in production. Storage policies are NOT relied on for
-- the happy path; they exist only as defense in depth.
--
-- File-path convention
-- --------------------
--   <campground_id>.<ext>
-- where <ext> is one of png, jpg, webp, pdf. One map per campground;
-- a Replace upload upserts to the same path (when the extension
-- matches) or removes any conflicting alternate-extension files
-- (when the new file has a different extension, e.g. PNG -> PDF).
-- The remove step is best-effort -- if it fails (someone deleted via
-- the Dashboard, transient storage 404, etc.) the upload still
-- succeeds.
--
-- What this migration does NOT do
-- -------------------------------
--   * No DELETE, no UPDATE, no DROP -- pure additive DDL.
--   * No changes to existing rows -- the four new columns default
--     to NULL; campgrounds that never upload remain identical to
--     today (and keep working with the URL-only flow from
--     migration 0048).
--   * No changes to row-level RLS policies on campgrounds.
--   * No changes to the show_park_map toggle, park_map_url, or
--     park_map_notes columns from migration 0048.
--   * No changes to Stripe, billing, prices, webhooks, env vars,
--     customer records.
--   * No new tables.

alter table public.campgrounds
  add column if not exists park_map_path text,
  add column if not exists park_map_file_type text,
  add column if not exists park_map_file_name text,
  add column if not exists park_map_updated_at timestamptz;

-- Anon SELECT for the four new columns. Mirrors the additive grants
-- in mig 0048 / 0049. Authenticated + service_role retain full
-- SELECT on every column already; this GRANT is anon-only.
grant select (
  park_map_path,
  park_map_file_type,
  park_map_file_name,
  park_map_updated_at
) on public.campgrounds to anon;

-- Optional MIME sanity CHECK. Belt-and-suspenders -- the API
-- already validates MIME server-side in uploadParkMapAction, but
-- this catches any future write path that bypasses the action.
-- NULL is allowed (most campgrounds have no upload).
alter table public.campgrounds
  drop constraint if exists campgrounds_park_map_file_type_check;
alter table public.campgrounds
  add constraint campgrounds_park_map_file_type_check
  check (
    park_map_file_type is null or park_map_file_type in (
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf'
    )
  );

-- Supabase Storage bucket creation. Public read; writes still
-- gated by server actions running as service_role. on conflict
-- do nothing so re-running the migration locally (or after a
-- partial apply) is safe.
insert into storage.buckets (id, name, public)
values ('campground-maps', 'campground-maps', true)
on conflict (id) do nothing;

comment on column public.campgrounds.park_map_path is
  'Public Supabase Storage URL of the owner-uploaded park map (despite the column name "path", this is a full URL, with ?v=<ts> cache buster, identical convention to logo_url). Takes precedence over park_map_url when both are set.';
comment on column public.campgrounds.park_map_file_type is
  'MIME type of the uploaded park map file. One of image/png, image/jpeg, image/webp, application/pdf. NULL when no file is uploaded. Drives the guest hub branch between inline image render and the PDF "View" button.';
comment on column public.campgrounds.park_map_file_name is
  'Original filename of the uploaded park map. Owner-side display only; never shown to guests.';
comment on column public.campgrounds.park_map_updated_at is
  'Timestamp of the most recent park map upload. Stamped by uploadParkMapAction; nulled by clearParkMapAction. NULL when no file has ever been uploaded.';

-- 0048_campground_park_map.sql
-- Adds Park Map fields to the campground guest hub. URL-only this
-- phase; actual file upload comes later. The owner pastes a public
-- URL (Google Drive, Imgur, hosted PDF, the park's own website map,
-- etc.) and the public guest hub renders a card linking out to it.
--
-- Three columns, all additive:
--   show_park_map (bool, default false) -- owner-controlled toggle.
--     New campgrounds default to false so existing campgrounds keep
--     their current behaviour and don't suddenly expose a half-empty
--     map card.
--   park_map_url (text, nullable) -- the public URL the owner pasted.
--     Validation is at the app layer (zod optionalUrl helper); no DB
--     CHECK constraint, matching the existing booking_url +
--     google_review_url pattern.
--   park_map_notes (text, nullable) -- optional short caption shown
--     under the map link on the public guest hub. 500-char cap at the
--     app layer; no DB length limit, matching booking_message.
--
-- Render contract on the public guest hub: the card appears only when
--   show_park_map = true AND park_map_url IS NOT NULL.
-- A toggled-on row with a null URL renders nothing -- no half-card.
--
-- RLS: campgrounds RLS policies (mig 0047) operate at the row level;
-- column-level grants control which columns each role can SELECT.
-- Migration 0047 narrowed anon SELECT to a hand-picked list of
-- public-safe columns, so any new column defaults to "not granted to
-- anon" until explicitly added. Without the GRANT below, anon
-- PostgREST queries would see null for these columns. The public
-- welcome page + guest hub run via the service_role admin client
-- and bypass column grants, so the render works either way -- but
-- granting anon SELECT keeps the column list semantically honest
-- (these are public-by-design fields) and future-proofs any
-- browser-side read path that may be added later.
--
-- Authenticated and service_role retain full SELECT on every column
-- already; this GRANT is anon-only.
--
-- What this migration does NOT do:
--   * No DELETE, no UPDATE, no DROP. Pure DDL.
--   * No changes to existing rows -- existing campgrounds get
--     show_park_map=false / null URLs / null notes via the column
--     default and stay invisible until the owner toggles in.
--   * No changes to RLS row-level policies.
--   * No changes to UPDATE/INSERT/DELETE policies on campgrounds.
--   * No changes to Stripe, prices, webhooks, env vars.

alter table public.campgrounds
  add column if not exists show_park_map boolean not null default false,
  add column if not exists park_map_url text,
  add column if not exists park_map_notes text;

grant select (show_park_map, park_map_url, park_map_notes)
  on public.campgrounds to anon;

comment on column public.campgrounds.show_park_map is
  'Owner-controlled toggle. When true and park_map_url is non-null, the public guest hub renders a Park Map card linking out to park_map_url.';
comment on column public.campgrounds.park_map_url is
  'Public URL the owner pasted -- Google Drive link, hosted PDF, image URL, the park website map page, etc. App-layer validation only.';
comment on column public.campgrounds.park_map_notes is
  'Optional short caption shown under the Park Map link on the public guest hub. App-layer cap is 500 chars.';

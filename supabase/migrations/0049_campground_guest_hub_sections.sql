-- 0049_campground_guest_hub_sections.sql
-- Adds four more guest-hub sections to the campground row: Wi-Fi
-- Info, Rules & Policies, Emergency Info, and Local Recommendations.
-- All additive, all text-only, all owner-toggled. Pattern matches
-- migration 0048 (Park Map): toggle + content fields + anon column
-- grants.
--
-- Why text-only fields instead of new tables: this phase aims to
-- ship the four most-requested guest-hub cards with the smallest
-- possible surface area. Add/edit/delete CRUD with a separate
-- table (e.g. for repeatable local-recommendation rows) is a
-- larger change and is intentionally deferred -- the owner pastes
-- a paragraph into a textarea for now, and a future migration can
-- introduce a normalized table without breaking this fallback.
--
-- New columns (all additive, all default off/null):
--   Wi-Fi Info
--     show_wifi (bool, default false) -- owner toggle.
--     wifi_network_name (text, null) -- SSID the guest types into
--       their device. Public by design (this is the GUEST network,
--       not staff/admin).
--     wifi_password (text, null) -- the password. Yes, this is
--       readable by anon -- the helper text on the owner form
--       reminds them to only enter guest credentials.
--     wifi_notes (text, null) -- optional short caption.
--
--   Rules & Policies
--     show_rules (bool, default false) -- owner toggle.
--     rules_text (text, null) -- the rules. Free-form text. Owner
--       can use line breaks; the public hub preserves them with
--       whitespace-pre-wrap.
--
--   Emergency Info
--     show_emergency_info (bool, default false) -- owner toggle.
--     emergency_contact_number (text, null) -- primary phone.
--     emergency_after_hours (text, null) -- after-hours line.
--     emergency_shelter_notes (text, null) -- storm shelter info,
--       evacuation, etc.
--     emergency_other_notes (text, null) -- anything else worth
--       knowing in an emergency.
--
--   Local Recommendations
--     show_local_recommendations (bool, default false) -- owner toggle.
--     local_recommendations_text (text, null) -- free-form
--       paragraph. Future-proof: a separate
--       campground_local_recommendations table with rows can be
--       introduced later without breaking this column (just stop
--       reading it for owners who have rows).
--
-- Render contract on the public guest hub: each card renders only
-- when its show_* toggle is true AND at least one content field is
-- non-null. Half-configured states never render a partial card.
--
-- Anon column grants: same hygiene as migration 0048. These
-- columns are public-by-design guest-hub content, so they go in
-- anon's allow-list. The public guest hub still uses the
-- service_role admin client and bypasses column grants, but the
-- grants future-proof any browser-side read path.
--
-- What this migration does NOT do:
--   * No DELETE, no UPDATE, no DROP. Pure additive DDL.
--   * No changes to existing rows -- defaults make every campground
--     start with every new card off.
--   * No changes to RLS row-level policies.
--   * No changes to UPDATE/INSERT/DELETE policies on campgrounds.
--   * No changes to Stripe, billing, prices, webhooks, env vars.
--   * No new tables -- existing campgrounds row absorbs the fields.

alter table public.campgrounds
  add column if not exists show_wifi boolean not null default false,
  add column if not exists wifi_network_name text,
  add column if not exists wifi_password text,
  add column if not exists wifi_notes text,
  add column if not exists show_rules boolean not null default false,
  add column if not exists rules_text text,
  add column if not exists show_emergency_info boolean not null default false,
  add column if not exists emergency_contact_number text,
  add column if not exists emergency_after_hours text,
  add column if not exists emergency_shelter_notes text,
  add column if not exists emergency_other_notes text,
  add column if not exists show_local_recommendations boolean not null default false,
  add column if not exists local_recommendations_text text;

grant select (
  show_wifi, wifi_network_name, wifi_password, wifi_notes,
  show_rules, rules_text,
  show_emergency_info, emergency_contact_number, emergency_after_hours,
  emergency_shelter_notes, emergency_other_notes,
  show_local_recommendations, local_recommendations_text
) on public.campgrounds to anon;

comment on column public.campgrounds.show_wifi is
  'Owner-controlled toggle. When true and wifi_network_name is non-null, the public guest hub renders a Wi-Fi card.';
comment on column public.campgrounds.wifi_password is
  'GUEST Wi-Fi password only. Readable by anon. Owners are warned in the UI to never enter staff/admin credentials here.';
comment on column public.campgrounds.show_rules is
  'Owner-controlled toggle. When true and rules_text is non-empty, the public guest hub renders a Rules & Policies card.';
comment on column public.campgrounds.show_emergency_info is
  'Owner-controlled toggle. When true and at least one emergency_* field is non-null, the public guest hub renders an Emergency Info card.';
comment on column public.campgrounds.show_local_recommendations is
  'Owner-controlled toggle. When true and local_recommendations_text is non-empty, the public guest hub renders a Local Recommendations card. Future: may be supplemented by a separate campground_local_recommendations table for row-based add/edit.';

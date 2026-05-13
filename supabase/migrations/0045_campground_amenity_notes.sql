-- Add per-amenity owner-written notes to the campground row. Surfaced
-- as an optional sub-line under each amenity card on the Updates Only
-- page (e.g. "Wi-Fi" + "Password available at office", "Laundry" +
-- "Open 8 AM–10 PM").
--
-- Stored as a flat jsonb map from amenity label (the same string saved
-- in campgrounds.amenities) → note text. Example:
--   { "WiFi": "Password at office", "Laundry": "Open 8 AM–10 PM" }
--
-- Backwards compatible: defaults to '{}' so every existing row keeps
-- rendering its current amenity labels with no notes. The server-side
-- save action prunes keys whose amenity is no longer in the array,
-- so the column doesn't accumulate orphan entries from amenities
-- the owner removed.
--
-- Renderer contract: if the value for a label is missing, empty, or
-- whitespace-only, the camper UI shows just the amenity name (no
-- note line). Always optional.
--
-- RLS: campgrounds.amenity_notes inherits the existing campgrounds
-- read/write policies. Owners can already update their own campground
-- row; campers + public read paths already see campground rows via
-- the service-role admin client. No new policies needed.

alter table public.campgrounds
  add column if not exists amenity_notes jsonb not null default '{}'::jsonb;

comment on column public.campgrounds.amenity_notes is
  'Optional per-amenity owner notes shown on /campground/<slug>/updates. '
  'Map from amenity label (matches an entry in campgrounds.amenities) to a '
  'short free-text note. Keys without a matching amenity are ignored by the '
  'renderer; the save action prunes orphan keys.';

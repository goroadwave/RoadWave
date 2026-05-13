-- Additional interest slugs surfaced by the /quickcheckin form so
-- camper picks during the QR check-in flow land in profile_interests
-- with proper labels (instead of being mapped onto existing rough
-- equivalents). Additive only, idempotent — no data migration, no
-- schema changes.
--
-- Existing interests (migrations 0001 + 0003): coffee, campfire, dogs,
--   hiking, kayaking, cards, live_music, cats, paddle_boarding,
--   ebikes, boating, atv_utv, sports.
--
-- Added here:
--   pickleball     — popular at RV parks; the original list had only
--                    the broader "sports" slug
--   fishing        — distinct from "boating"
--   board_games    — distinct from "cards"
--   sunset_meetup  — informal evening hangouts; distinct from
--                    "live_music"

insert into public.interests (slug, label) values
  ('pickleball',    'Pickleball'),
  ('fishing',       'Fishing'),
  ('board_games',   'Board games'),
  ('sunset_meetup', 'Sunset meetup')
on conflict (slug) do nothing;

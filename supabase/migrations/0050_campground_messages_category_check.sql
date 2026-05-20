-- 0050_campground_messages_category_check.sql
-- Extend the campground_messages.category CHECK constraint to cover
-- the 9-category contact-form dropdown shipped in commit e18ff63.
--
-- Why this migration is needed:
-- ----------------------------
-- The original CHECK from migration 0039 hard-coded the 9 category
-- slugs that the dropdown surfaced at that time: wifi, laundry,
-- propane, late_checkout, maintenance, quiet_hours,
-- local_recommendations, activities, general_question. The 2026-05-20
-- category alignment introduced five new slugs in the API allow-list
-- (noise, bathroom_laundry, compliment, suggestion, safety_concern)
-- without updating this constraint. Result: the API accepted the
-- payload but Postgres rejected the insert with
-- "campground_messages_category_check" violation, returning a 500
-- to the guest's contact form submission. This migration corrects
-- that.
--
-- The new constraint accepts the full union of:
--   * Current dropdown set: wifi, maintenance, noise,
--     bathroom_laundry, late_checkout, general_question, compliment,
--     suggestion, safety_concern.
--   * Legacy slugs still in ALLOWED_CATEGORIES (and still labelled
--     in the email + owner-inbox label maps): laundry, propane,
--     quiet_hours, local_recommendations, activities.
--   * NULL -- required so pulse_needs_attention rows can continue
--     to be inserted without a category, as they were under the
--     0039 constraint.
--
-- What this migration does NOT do:
--   * No DELETE / UPDATE / DROP TABLE -- only one constraint is
--     dropped and re-added with a wider whitelist.
--   * No existing rows are touched. The new constraint is checked
--     against existing rows at constraint-creation time; every
--     row currently in the table was inserted under the original
--     constraint so they're all in the new whitelist by definition.
--   * No changes to RLS, indexes, triggers, or the
--     owner_messages_for_campground RPC.
--   * No changes to Stripe, billing, env vars, or customer records.

alter table public.campground_messages
  drop constraint if exists campground_messages_category_check;

alter table public.campground_messages
  add constraint campground_messages_category_check
  check (
    category is null or category in (
      -- Current 9-category dropdown:
      'wifi',
      'maintenance',
      'noise',
      'bathroom_laundry',
      'late_checkout',
      'general_question',
      'compliment',
      'suggestion',
      'safety_concern',
      -- Backward-compat (still accepted by the API and labelled in
      -- the owner inbox + alert email; not surfaced in the
      -- dropdown anymore but old messages keep their original
      -- category value):
      'laundry',
      'propane',
      'quiet_hours',
      'local_recommendations',
      'activities'
    )
  );

comment on constraint campground_messages_category_check
  on public.campground_messages is
  'Allow-list for contact-form category slugs. Updated 2026-05-20 to add the noise / bathroom_laundry / compliment / suggestion / safety_concern slugs introduced by the 9-category dropdown alignment, while keeping the five legacy slugs accepted so historical rows and any third-party clients still validate.';

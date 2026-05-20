-- 0057_facebook_link.sql
-- Phase 1 of the camper QR "Support This Campground" + feedback overhaul.
--
-- Adds three optional Facebook fields on the campgrounds row so the
-- welcome page can render an owner-configurable "Recommend Us on
-- Facebook" / similar CTA alongside the existing Google Review and
-- Book Again buttons. Mirrors the shape of the existing review/book
-- columns added by mig 0039.
--
-- Columns
-- -------
--   feature_facebook_enabled   boolean not null default false
--     -- Owner-side toggle. Defaults to false so existing campgrounds
--     -- don't suddenly grow a Facebook button on their welcome page
--     -- without the owner opting in. (Contrast: review + book columns
--     -- in mig 0039 defaulted to TRUE, but those came with the
--     -- feature launch; this one is an additive new surface.)
--
--   facebook_review_url        text
--     -- Owner-pasted destination. The welcome page renders the
--     -- button only when BOTH the feature flag is true AND this URL
--     -- is non-null (same defensive rule the Review + Book Again
--     -- buttons already use).
--
--   facebook_button_label      text
--     -- Optional owner-chosen label. NULL => the welcome page falls
--     -- back to the default "Recommend Us on Facebook" string at the
--     -- app layer. ≤ 60 chars enforced at the API layer.
--
-- What this migration does NOT do
-- -------------------------------
--   * No changes to campground_messages, RLS, or any RPC.
--   * No grants. (campgrounds reads are already covered by existing
--     anon-read policy from mig 0047.)
--   * No data writes. Pure additive DDL.
--   * Nothing touched in Stripe, billing, waves, discovery, public
--     profiles, QR routing, owner preview, or the QR print card.
--
-- Phases that come LATER (separate migrations)
-- --------------------------------------------
--   * 0058: is_feedback_only boolean on campground_messages so the
--     active inbox can exclude compliment / suggestion / general
--     feedback while the new feedback view still surfaces it.
--   * 0059: owner_feedback_summary RPC (counts + recent rows).
--
-- Both will land before the corresponding code phases ship.

alter table public.campgrounds
  add column if not exists feature_facebook_enabled boolean not null default false,
  add column if not exists facebook_review_url text,
  add column if not exists facebook_button_label text;

comment on column public.campgrounds.feature_facebook_enabled is
  'Owner toggle. Defaults to false because this is an additive surface added after the original engagement hub launch (mig 0039). The welcome page renders the Facebook CTA only when this is true AND facebook_review_url is non-null.';

comment on column public.campgrounds.facebook_review_url is
  'Owner-pasted Facebook page / recommendation / review URL. App layer normalizes / lightly validates before persisting. NULL means no button.';

comment on column public.campgrounds.facebook_button_label is
  'Optional owner-chosen CTA text. NULL => app falls back to "Recommend Us on Facebook". Capped at ~60 chars at the API layer; longer values truncated.';

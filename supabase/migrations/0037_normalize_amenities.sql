-- ============================================================================
-- 0037_normalize_amenities.sql
-- Convert legacy slug-style amenity values stored on campgrounds.amenities
-- to the display-label form the new owner profile form (and renderers)
-- expect. The new form saves labels like "Full Hookups", "Heated Pool",
-- "Dog-Friendly" — the old form saved internal slugs. Without this
-- normalization, an owner opening the redesigned profile form would see
-- their previously-checked amenities as un-checked, and the welcome page
-- would render raw slugs like "full_hookups" instead of "Full Hookups".
--
-- Idempotent: anything not in the slug→label map passes through unchanged.
-- ============================================================================

update public.campgrounds
set amenities = (
  select coalesce(array_agg(translated), '{}')
  from (
    select case v
      when 'full_hookups' then 'Full Hookups'
      when 'water_electric' then 'Water/Electric'
      when 'tent_sites' then 'Tent Sites'
      when 'wifi' then 'WiFi'
      when 'pool' then 'Pool'
      when 'dog_friendly' then 'Dog-Friendly'
      when 'laundry' then 'Laundry'
      when 'store' then 'Store'
      when 'restrooms' then 'Restrooms'
      when 'showers' then 'Showers'
      else v
    end as translated
    from unnest(amenities) as v
  ) as t
)
where exists (
  select 1 from unnest(amenities) as v
  where v in (
    'full_hookups', 'water_electric', 'tent_sites', 'wifi', 'pool',
    'dog_friendly', 'laundry', 'store', 'restrooms', 'showers'
  )
);

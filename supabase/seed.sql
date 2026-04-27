-- Local dev seed data. Not applied in production.
-- Provides two sample campgrounds you can check into for testing.
insert into public.campgrounds (slug, name, city, region) values
  ('riverbend-rv-park', 'Riverbend RV Park', 'Asheville', 'NC'),
  ('coastal-pines',     'Coastal Pines Campground', 'Bandon', 'OR')
on conflict (slug) do nothing;

-- Ensure every campground has a QR token (idempotent).
insert into public.campground_qr_tokens (campground_id)
select c.id
from public.campgrounds c
left join public.campground_qr_tokens t on t.campground_id = c.id
where t.campground_id is null;

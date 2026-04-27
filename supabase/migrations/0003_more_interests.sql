-- Add six more interests to the catalog. Idempotent.
insert into public.interests (slug, label) values
  ('cats',            'Cats'),
  ('paddle_boarding', 'Paddle boarding'),
  ('ebikes',          'E-bikes'),
  ('boating',         'Boating'),
  ('atv_utv',         'ATV/UTV'),
  ('sports',          'Sports')
on conflict (slug) do nothing;

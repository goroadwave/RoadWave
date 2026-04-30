-- ============================================================================
-- 0022_demo_pages.sql
-- Backs the self-serve interactive demo on /campgrounds. A guest fills out
-- a campground name (+ optional logo / website / city / region), gets a
-- live preview, and can save/share a personalized URL at /demo/<slug>.
-- Saved demos live for 30 days.
--
--   demo_pages   — one row per saved preview (no FK to auth.users; the
--                  flow is anonymous).
--   demo-logos   — public-read bucket for the optional logo. Service-role
--                  writes via /api/demo so anonymous browsers don't get
--                  raw write access to storage.
-- ============================================================================

create table if not exists public.demo_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9-]{3,80}$'),
  campground_name text not null
    check (char_length(campground_name) between 1 and 120),
  logo_url text,
  website text,
  city text,
  region text,
  email text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists demo_pages_slug_idx on public.demo_pages (slug);
create index if not exists demo_pages_expires_idx on public.demo_pages (expires_at);

alter table public.demo_pages enable row level security;

-- Public read — anyone with the link can view the preview while it's live.
drop policy if exists demo_pages_select_active on public.demo_pages;
create policy demo_pages_select_active
  on public.demo_pages for select
  to anon, authenticated
  using (expires_at > now());

-- No INSERT / UPDATE / DELETE policies — only the service role (via
-- /api/demo) writes. RLS-with-no-permitting-policy = deny.

-- Storage bucket for optional logos. Public read so the preview page can
-- render without auth. Service-role-only uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'demo-logos',
  'demo-logos',
  true,
  2097152, -- 2 MB cap
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- SELECT for everyone (the bucket is public:true; explicit policy is
-- belt-and-suspenders for installations that require both).
drop policy if exists "anyone_read_demo_logos" on storage.objects;
create policy "anyone_read_demo_logos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'demo-logos');

-- No INSERT / UPDATE / DELETE policies on storage.objects for this
-- bucket — service role bypasses RLS, so /api/demo is the only path that
-- can write here.

-- ============================================================================
-- 0007_campground_requests.sql
-- Captures "I want RoadWave at this campground" requests from the homepage.
-- Service-role only — anon and authenticated have no access. The
-- /api/campground-request route uses the admin client to insert.
-- ============================================================================

create table if not exists public.campground_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  campground_name text not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists campground_requests_created_idx
  on public.campground_requests (created_at desc);

create index if not exists campground_requests_name_idx
  on public.campground_requests (lower(campground_name));

alter table public.campground_requests enable row level security;
-- Intentionally no policies. service_role bypasses RLS, so the admin
-- client can read/write; anon and authenticated cannot touch this table
-- through PostgREST.

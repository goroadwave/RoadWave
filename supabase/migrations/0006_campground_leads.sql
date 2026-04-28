-- ============================================================================
-- 0006_campground_leads.sql
-- Captures demo requests from /campgrounds. Service-role only — anon and
-- authenticated have no access. The /api/campground-lead route uses the
-- admin client to insert.
-- ============================================================================

create table if not exists public.campground_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campground_name text not null,
  email text not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists campground_leads_created_idx
  on public.campground_leads (created_at desc);

alter table public.campground_leads enable row level security;
-- Intentionally no policies. service_role bypasses RLS, so the admin
-- client can read/write; anon and authenticated cannot touch this table
-- through PostgREST.

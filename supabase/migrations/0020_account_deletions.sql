-- ============================================================================
-- 0020_account_deletions.sql
-- Compliance log for self-serve account deletions. One row per delete event,
-- preserved beyond the user's own row so we can prove a deletion happened
-- (and, optionally, when + how) without retaining the user's profile data.
--
-- IMPORTANT: this table does NOT foreign-key to auth.users. The whole point
-- is that the row survives the cascade-delete of the user. We store the
-- user_id as a uuid value only, plus a snapshot of the email at deletion
-- time and the request metadata, but no profile fields.
-- ============================================================================

create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email_at_deletion text,
  method text not null check (method in ('self_serve', 'manual')),
  ip_address inet,
  user_agent text,
  notes text,
  deleted_at timestamptz not null default now()
);

create index if not exists account_deletions_deleted_at_idx
  on public.account_deletions (deleted_at desc);

-- RLS: nobody but the service role can read or insert. End users have no
-- need to query their own deletion record (they're gone), and the
-- compliance log shouldn't be exposed.
alter table public.account_deletions enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated. Service-role
-- writes only. Leaving RLS enabled with no permitting policy = locked down.

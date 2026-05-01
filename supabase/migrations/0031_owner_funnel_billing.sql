-- ============================================================================
-- 0031_owner_funnel_billing.sql
-- Self-serve owner funnel + Stripe billing.
--
-- Adds billing + onboarding columns to campgrounds, a new
-- owner_signup_submissions table to capture the form snapshot before
-- Stripe Checkout, and an admin RPC to extend trial windows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Billing + onboarding columns on campgrounds.
-- ----------------------------------------------------------------------------
alter table public.campgrounds
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text
    check (plan is null or plan in ('monthly', 'annual')),
  add column if not exists subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'canceled')),
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days'),
  add column if not exists current_period_end timestamptz,
  add column if not exists onb_qr_printed boolean not null default false,
  add column if not exists onb_qr_posted boolean not null default false,
  add column if not exists onb_first_bulletin_sent boolean not null default false;

create index if not exists campgrounds_subscription_status_idx
  on public.campgrounds (subscription_status, trial_ends_at);
create index if not exists campgrounds_stripe_customer_idx
  on public.campgrounds (stripe_customer_id)
  where stripe_customer_id is not null;
create index if not exists campgrounds_stripe_subscription_idx
  on public.campgrounds (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ----------------------------------------------------------------------------
-- 2. owner_signup_submissions: form snapshot for the self-serve funnel.
--    Persists EVEN IF the visitor abandons at Stripe Checkout, so the
--    founder can follow up. Service-role only writes; admin reads via
--    the is_admin() helper from migration 0029.
-- ----------------------------------------------------------------------------
create table if not exists public.owner_signup_submissions (
  id uuid primary key default gen_random_uuid(),
  campground_name text not null,
  owner_name text not null,
  email text not null,
  phone text,
  website text,
  city text,
  state text,
  num_sites int,
  campground_type text
    check (campground_type is null or campground_type in (
      'rv_park', 'resort', 'state_park', 'private', 'seasonal', 'other'
    )),
  hosts_events boolean not null default false,
  target_guests text
    check (target_guests is null or target_guests in (
      'overnight', 'seasonal', 'events', 'all'
    )),
  logo_url text,
  wants_setup_call boolean not null default false,
  accepted_partner_terms boolean not null default false,
  ack_optional boolean not null default false,
  ack_no_site_numbers boolean not null default false,
  ack_not_emergency boolean not null default false,
  ip_address inet,
  user_agent text,
  stripe_session_id text,
  status text not null default 'new'
    check (status in ('new', 'paid', 'abandoned', 'provisioned')),
  campground_id uuid references public.campgrounds(id) on delete set null,
  provisioned_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owner_signup_submissions_status_idx
  on public.owner_signup_submissions (status, created_at desc);
create index if not exists owner_signup_submissions_email_idx
  on public.owner_signup_submissions (email);
create index if not exists owner_signup_submissions_session_idx
  on public.owner_signup_submissions (stripe_session_id)
  where stripe_session_id is not null;

drop trigger if exists owner_signup_submissions_set_updated_at
  on public.owner_signup_submissions;
create trigger owner_signup_submissions_set_updated_at
  before update on public.owner_signup_submissions
  for each row execute function public.set_updated_at();

alter table public.owner_signup_submissions enable row level security;

-- Admin can read all submissions (uses the is_admin() helper from 0029
-- which bypasses RLS to avoid the recursive lookup).
drop policy if exists owner_signup_submissions_admin_select
  on public.owner_signup_submissions;
create policy owner_signup_submissions_admin_select
  on public.owner_signup_submissions for select
  to authenticated
  using (public.is_admin());

-- No INSERT / UPDATE policies for end users — the public funnel writes
-- via the service-role admin client; the Stripe webhook updates via
-- the same client. Admins read, the system writes.

-- ----------------------------------------------------------------------------
-- 3. Admin RPC: extend a campground's trial window.
-- ----------------------------------------------------------------------------
create or replace function public.extend_campground_trial(
  _campground_id uuid,
  _days int
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  _new_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if _days <= 0 or _days > 365 then
    raise exception 'days must be between 1 and 365' using errcode = '22023';
  end if;

  update public.campgrounds
     set trial_ends_at = greatest(trial_ends_at, now()) + make_interval(days => _days),
         subscription_status = case
           when subscription_status = 'canceled' then 'trial'
           else subscription_status
         end
   where id = _campground_id
   returning trial_ends_at into _new_end;

  if _new_end is null then
    raise exception 'campground not found' using errcode = 'P0002';
  end if;

  return _new_end;
end;
$$;

revoke all on function public.extend_campground_trial(uuid, int) from public;
grant execute on function public.extend_campground_trial(uuid, int) to authenticated;

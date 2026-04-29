-- ============================================================================
-- 0014_relax_years_rving.sql
-- The original profiles.years_rving CHECK capped values at 100. That was
-- showing "Too big: expected number to be <=100" to users in the profile
-- editor when they mistyped or interpreted the field broadly. Replace
-- the CHECK with a looser bound that still rules out negatives + crazy
-- integer-overflow values, but doesn't second-guess realistic entries.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_years_rving_check;

alter table public.profiles
  add constraint profiles_years_rving_check
  check (years_rving is null or (years_rving >= 0 and years_rving <= 9999));

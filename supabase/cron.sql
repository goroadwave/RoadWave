-- ============================================================================
-- Schedule the 24-hour check-in expiry sweep with pg_cron (recommended).
-- Run this once after enabling the pg_cron extension in your Supabase project:
--   Dashboard → Database → Extensions → pg_cron → Enable.
-- ============================================================================

-- Run every 10 minutes.
select cron.schedule(
  'roadwave-expire-checkins',
  '*/10 * * * *',
  $$ select public.expire_old_check_ins(); $$
);

-- Verify the schedule was created:
--   select jobid, jobname, schedule, command from cron.job;

-- To remove the schedule:
--   select cron.unschedule('roadwave-expire-checkins');

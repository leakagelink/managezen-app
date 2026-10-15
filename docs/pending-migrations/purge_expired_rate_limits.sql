-- NOT APPLIED. Requires explicit owner approval before running on production.
-- Purpose: automatically delete expired rate-limit entries (public.rate_limits only).
-- Longest limiter window in app code is 24h (del-email, req-email), so a 25h cutoff never
-- removes an entry that can still count toward a limit.

-- Step 1 (migration): scheduler extension + narrow, batched purge function
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.purge_expired_rate_limits(_batch integer DEFAULT 5000, _max_batches integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer; total integer := 0; i integer := 0;
BEGIN
  IF _batch < 1 OR _batch > 50000 OR _max_batches < 1 OR _max_batches > 100 THEN
    RAISE EXCEPTION 'Invalid batch settings';
  END IF;
  LOOP
    DELETE FROM public.rate_limits
     WHERE id IN (SELECT id FROM public.rate_limits
                   WHERE created_at < now() - interval '25 hours'
                   ORDER BY created_at
                   LIMIT _batch);
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n; i := i + 1;
    EXIT WHEN n < _batch OR i >= _max_batches;
  END LOOP;
  RETURN total;
END $$;

REVOKE ALL ON FUNCTION public.purge_expired_rate_limits(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits(integer, integer) TO service_role;

CREATE INDEX IF NOT EXISTS rate_limits_created_at_idx ON public.rate_limits(created_at);

-- Step 2: schedule (pg_cron runs in UTC). Every hour at minute 17.
SELECT cron.schedule('purge-expired-rate-limits', '17 * * * *',
  $job$SELECT public.purge_expired_rate_limits(5000, 10)$job$);

-- Verification (read-only)
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'purge-expired-rate-limits';
-- SELECT status, return_message, start_time, end_time FROM cron.job_run_details
--  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-rate-limits')
--  ORDER BY start_time DESC LIMIT 5;
-- SELECT count(*) FILTER (WHERE created_at <  now() - interval '25 hours') AS expired,
--        count(*) FILTER (WHERE created_at >= now() - interval '25 hours') AS active
--   FROM public.rate_limits;

-- Disable (keeps job, reversible):
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-rate-limits'), active := false);
-- Full rollback:
-- SELECT cron.unschedule('purge-expired-rate-limits');
-- DROP FUNCTION IF EXISTS public.purge_expired_rate_limits(integer, integer);
-- DROP INDEX IF EXISTS public.rate_limits_created_at_idx;

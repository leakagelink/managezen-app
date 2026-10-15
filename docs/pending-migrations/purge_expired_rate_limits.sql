-- NOT APPLIED. Requires explicit owner approval before running on production.
-- Revision 2: empty search_path + fully schema-qualified names; idempotent scheduling.
-- Purpose: automatically delete expired rate-limit entries (public.rate_limits only).
-- Longest limiter window in app code is 24h (del-email, req-email); a 25h cutoff never
-- removes an entry that can still count toward a limit.
-- Run as ONE migration (single transaction). Executed by the privileged migration role (postgres).

-- 1. Scheduler extension (no-op if already present)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- 2. Narrow, batched purge function. Empty search_path: every object is schema-qualified,
--    so nothing can be shadowed by objects created elsewhere.
CREATE OR REPLACE FUNCTION public.purge_expired_rate_limits(_batch integer DEFAULT 5000, _max_batches integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE n integer; total integer := 0; i integer := 0;
BEGIN
  IF _batch IS NULL OR _max_batches IS NULL OR _batch < 1 OR _batch > 50000
     OR _max_batches < 1 OR _max_batches > 100 THEN
    RAISE EXCEPTION 'Invalid batch settings';
  END IF;
  LOOP
    DELETE FROM public.rate_limits
     WHERE id IN (SELECT r.id FROM public.rate_limits r
                   WHERE r.created_at < pg_catalog.now() - interval '25 hours'
                   ORDER BY r.created_at
                   LIMIT _batch);
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n; i := i + 1;
    EXIT WHEN n < _batch OR i >= _max_batches;
  END LOOP;
  RETURN total;
END $$;

REVOKE ALL ON FUNCTION public.purge_expired_rate_limits(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits(integer, integer) TO service_role;

-- 3. Index (table is ~8 rows / 48 kB; plain CREATE INDEX locks writes for milliseconds).
CREATE INDEX IF NOT EXISTS rate_limits_created_at_idx ON public.rate_limits (created_at);

-- 4. Idempotent schedule: pg_cron 1.6 updates a job with the same name instead of adding a
--    second one. The guard below also makes a re-run a no-op when the job already matches.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
     WHERE jobname = 'purge-expired-rate-limits'
       AND schedule = '17 * * * *'
       AND command = 'SELECT public.purge_expired_rate_limits(5000, 10)'
       AND active
  ) THEN
    PERFORM cron.schedule('purge-expired-rate-limits', '17 * * * *',
      'SELECT public.purge_expired_rate_limits(5000, 10)');
  END IF;
END $do$;

-- ===== PRECHECKS (read-only, run BEFORE) =====
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';           -- expect 0 rows
-- SELECT count(*) FROM pg_proc WHERE proname = 'purge_expired_rate_limits';         -- expect 0
-- SELECT now() AS t0,
--        count(*) FILTER (WHERE created_at <  now() - interval '25 hours') AS expired,
--        count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS active_24h
--   FROM public.rate_limits;                                                         -- record t0 + counts

-- ===== POSTCHECKS (read-only, run AFTER) =====
-- SELECT jobid, jobname, schedule, command, username, active FROM cron.job
--  WHERE jobname = 'purge-expired-rate-limits';                                     -- expect exactly 1 row
-- SELECT p.prosecdef, p.proconfig,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authd,
--        has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc
--   FROM pg_proc p WHERE p.proname = 'purge_expired_rate_limits';                    -- expect true, {search_path=""}, false, false, true
-- After the next :17 UTC run:
-- SELECT status, return_message, start_time, end_time FROM cron.job_run_details
--  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-rate-limits')
--  ORDER BY start_time DESC LIMIT 3;                                                 -- expect 'succeeded'
-- SELECT count(*) FILTER (WHERE created_at <  now() - interval '25 hours') AS expired,
--        count(*) FILTER (WHERE created_at >= '<t0>'::timestamptz - interval '24 hours') AS active_since_t0
--   FROM public.rate_limits;                                                         -- expired = 0; active_since_t0 >= active_24h

-- ===== DISABLE (reversible) =====
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-rate-limits'), active := false);
-- ===== FULL ROLLBACK =====
-- SELECT cron.unschedule('purge-expired-rate-limits');
-- DROP FUNCTION IF EXISTS public.purge_expired_rate_limits(integer, integer);
-- DROP INDEX IF EXISTS public.rate_limits_created_at_idx;
-- (Leave the pg_cron extension installed; B will need it. Dropping it would remove all cron jobs.)

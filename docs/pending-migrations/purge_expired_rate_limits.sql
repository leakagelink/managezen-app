-- NOT APPLIED. Requires explicit owner approval before running on production.
-- Revision 3. Purpose: automatically delete expired rate-limit entries (public.rate_limits only).
-- Longest limiter window in app code is 24h (del-email, req-email); the 25h cutoff never removes an
-- entry that can still count toward a limit.
--
-- Evidence (read-only, production): pg_cron 1.6.4 available, in shared_preload_libraries and in
-- supautils.privileged_extensions; not relocatable; control file sets no schema; cron.database_name =
-- postgres; cron.timezone = GMT. Supabase install docs use: CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog.
-- pg_cron always creates its own objects in schema "cron"; WITH SCHEMA only records the extension's schema.
--
-- Executed as ONE migration (single transaction) by the privileged migration role (postgres).
-- Any failure rolls back everything, including the extension.

-- ========================= PRECHECKS (read-only, BEFORE) =========================
-- P1  SELECT extname FROM pg_extension WHERE extname = 'pg_cron';                         -- expect 0 rows
-- P2  SELECT count(*) FROM pg_proc WHERE proname = 'purge_expired_rate_limits';           -- expect 0
-- P3  SELECT now() AS t0, count(*) AS total,
--            count(*) FILTER (WHERE created_at <  now() - interval '25 hours') AS expired_now
--       FROM public.rate_limits;                                                            -- record t0
-- P4  SELECT id, created_at FROM public.rate_limits
--      WHERE created_at >= now() - interval '23 hours' ORDER BY created_at;                -- record ids (no PII)

-- ================================ MIGRATION ======================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

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

-- ~8 rows / 48 kB today: plain CREATE INDEX blocks writes for milliseconds.
-- (CONCURRENTLY is not allowed inside a transaction.)
CREATE INDEX IF NOT EXISTS rate_limits_created_at_idx ON public.rate_limits (created_at);

-- pg_cron 1.6: cron.schedule(name, ...) updates the existing job with the same name for the same
-- user instead of creating a second one. The guard additionally makes a re-run a no-op.
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

-- ========================= POSTCHECKS (read-only, AFTER) =========================
-- Q1  SELECT jobid, jobname, schedule, command, username, database, active
--       FROM cron.job WHERE jobname = 'purge-expired-rate-limits';
--     expect exactly 1 row: '17 * * * *', 'SELECT public.purge_expired_rate_limits(5000, 10)',
--     username = postgres, database = postgres, active = true
-- Q2  SELECT pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig,
--            has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
--            has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
--            has_function_privilege('service_role', p.oid, 'EXECUTE')  AS svc_exec
--       FROM pg_proc p WHERE p.proname = 'purge_expired_rate_limits';
--     expect postgres, true, {search_path=""}, false, false, true
-- Q3  SELECT r.rolname,
--            has_schema_privilege(r.rolname, 'cron', 'USAGE') AS cron_usage,
--            has_table_privilege(r.rolname, 'cron.job', 'INSERT,UPDATE,DELETE') AS job_write
--       FROM pg_roles r WHERE r.rolname IN ('anon', 'authenticated');
--     expect cron_usage = false and job_write = false for both
-- After the next :17 UTC run:
-- Q4  SELECT runid, status, return_message, start_time, end_time FROM cron.job_run_details
--      WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-rate-limits')
--      ORDER BY start_time DESC LIMIT 3;                         -- expect status 'succeeded'; note start_time = s
-- Q5  SELECT count(*) AS left_expired FROM public.rate_limits
--      WHERE created_at < '<s>'::timestamptz - interval '25 hours';                   -- expect 0
-- Q6  SELECT count(*) AS still_present FROM public.rate_limits WHERE id IN (<ids from P4>);
--     expect = number of P4 ids (all were younger than 25h at time s, because s - t0 < 2h)
-- Limits: counts and id lists show the result, not which statement deleted a row. Rows inserted and
-- aged out between checks are not individually traced. Exact delete-only-expired behaviour is proven
-- by the single WHERE clause above and by a staging test with synthetic rows (24h, 25h-1s, 25h+1s).

-- ============================ DISABLE (reversible) ===============================
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-rate-limits'), active := false);
-- ============================== FULL ROLLBACK ====================================
-- SELECT cron.unschedule('purge-expired-rate-limits');
-- DROP FUNCTION IF EXISTS public.purge_expired_rate_limits(integer, integer);
-- DROP INDEX IF EXISTS public.rate_limits_created_at_idx;
-- Do NOT drop pg_cron (dropping it deletes every cron job; B also needs it).
-- Rows already purged were expired hash entries and cannot be restored.

-- NOT APPLIED. Requires explicit owner approval before running on production.
-- Revision 5 (targeted: recursive membership check, backlog rule via delete counter, index precheck).
-- Purpose: automatically delete expired rate-limit entries (public.rate_limits only).
-- Longest limiter window in app code is 24h (del-email, req-email); the 25h cutoff never removes an
-- entry that can still count toward a limit.
--
-- Evidence (read-only, production): pg_cron 1.6.4 available, in shared_preload_libraries and in
-- supautils.privileged_extensions; not relocatable; control file sets no schema; cron.database_name =
-- postgres; cron.timezone = GMT. Supabase install docs use: CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog.
--
-- Executed as ONE migration (single transaction) by the privileged migration role (postgres).
--
-- Backlog / retry: one run deletes at most 5000 x 10 = 50,000 expired rows (oldest first), then stops.
-- Remaining expired rows are deleted by the next hourly run; a backlog of N rows clears in
-- ceil(N / 50,000) runs. A failed run deletes nothing (one transaction) and the next hour retries.
-- Production has ~8 rows today, so the first run is expected to clear everything.

-- ========================= PRECHECKS (read-only, BEFORE) =========================
-- P1  SELECT extname FROM pg_extension WHERE extname = 'pg_cron';                         -- expect 0 rows
-- P2  SELECT count(*) FROM pg_proc WHERE proname = 'purge_expired_rate_limits';           -- expect 0
-- P3  SELECT now() AS t0, count(*) AS total,
--            count(*) FILTER (WHERE created_at <  now() - interval '25 hours') AS expired_now,
--            (SELECT n_tup_del FROM pg_stat_user_tables
--              WHERE schemaname = 'public' AND relname = 'rate_limits') AS del0
--       FROM public.rate_limits;                                                            -- record t0, del0
-- P4  SELECT id, created_at FROM public.rate_limits
--      WHERE created_at >= now() - interval '23 hours' ORDER BY created_at;                -- record ids (no PII)
-- P5  Recursive role memberships (direct + indirect chains) of browser-facing roles:
--     WITH RECURSIVE chain(start_role, role_oid, path) AS (
--       SELECT r.rolname, r.oid, ARRAY[r.rolname::text]
--         FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','authenticator')
--       UNION
--       SELECT c.start_role, a.roleid, c.path || g.rolname::text
--         FROM chain c
--         JOIN pg_auth_members a ON a.member = c.role_oid
--         JOIN pg_roles g ON g.oid = a.roleid
--        WHERE NOT g.rolname = ANY (c.path)
--     )
--     SELECT c.start_role, g.rolname AS reachable_role, array_to_string(c.path, ' -> ') AS chain,
--            g.rolsuper, g.rolbypassrls, g.rolcreaterole
--       FROM chain c JOIN pg_roles g ON g.oid = c.role_oid
--      WHERE c.role_oid <> (SELECT oid FROM pg_roles WHERE rolname = c.start_role)
--      ORDER BY c.start_role, array_length(c.path, 1);
--     STOP if any reachable_role is postgres, service_role, supabase_admin, a role owning objects in
--     schema cron, or has rolsuper / rolbypassrls. (authenticator -> anon/authenticated/service_role
--     is Supabase's normal login switch: report it, it is NOT inheritance unless inherit is true; check
--     pg_auth_members.inherit_option for that edge before deciding.)
-- P6  Effective (inheritance-aware) privileges on public.rate_limits:
--     SELECT r.rolname,
--            has_table_privilege(r.rolname, 'public.rate_limits', 'SELECT,INSERT,UPDATE,DELETE') AS rl_any
--       FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','authenticator');   -- expect false
-- P7  Existing indexes on public.rate_limits:
--     SELECT indexname, indexdef FROM pg_indexes
--      WHERE schemaname = 'public' AND tablename = 'rate_limits' ORDER BY indexname;
--     Record whether rate_limits_created_at_idx already exists (pre_existing_idx = true/false).
--     STOP if it exists with a definition other than btree (created_at).

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

-- Strict duplicate guard:
--  * exact job already present (name, schedule, command, username=postgres, database=postgres, active) -> no-op
--  * any other job with this name (other owner, other database, other schedule/command, inactive) -> FAIL
--  * no job with this name -> create
DO $do$
DECLARE j record; n integer;
BEGIN
  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'purge-expired-rate-limits';
  IF n > 1 THEN
    RAISE EXCEPTION 'Multiple cron jobs named purge-expired-rate-limits exist; aborting';
  ELSIF n = 1 THEN
    SELECT * INTO j FROM cron.job WHERE jobname = 'purge-expired-rate-limits';
    IF j.schedule = '17 * * * *'
       AND j.command = 'SELECT public.purge_expired_rate_limits(5000, 10)'
       AND j.username = 'postgres' AND j.database = 'postgres' AND j.active THEN
      RETURN; -- already scheduled exactly as intended
    END IF;
    RAISE EXCEPTION 'Conflicting cron job purge-expired-rate-limits (owner %, database %, schedule %, active %); aborting',
      j.username, j.database, j.schedule, j.active;
  END IF;
  PERFORM cron.schedule('purge-expired-rate-limits', '17 * * * *',
    'SELECT public.purge_expired_rate_limits(5000, 10)');
END $do$;

-- ========================= POSTCHECKS (read-only, AFTER) =========================
-- Q1  SELECT jobid, jobname, schedule, command, username, database, active
--       FROM cron.job WHERE jobname = 'purge-expired-rate-limits';
--     expect exactly 1 row: '17 * * * *', 'SELECT public.purge_expired_rate_limits(5000, 10)',
--     username = postgres, database = postgres, active = true
-- Q2  SELECT pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig,
--            has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
--            has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
--            has_function_privilege('authenticator', p.oid, 'EXECUTE') AS authr_exec,
--            has_function_privilege('service_role', p.oid, 'EXECUTE')  AS svc_exec
--       FROM pg_proc p WHERE p.proname = 'purge_expired_rate_limits';
--     expect postgres, true, {search_path=""}, false, false, false, true
--     (has_*_privilege is effective: includes PUBLIC grants and inherited role memberships)
-- Q3  Effective cron control for browser-facing roles:
--     SELECT r.rolname,
--            has_schema_privilege(r.rolname, 'cron', 'USAGE')                          AS cron_usage,
--            has_table_privilege(r.rolname, 'cron.job', 'SELECT,INSERT,UPDATE,DELETE') AS job_any,
--            has_function_privilege(r.rolname, 'cron.schedule(text,text,text)', 'EXECUTE') AS can_schedule,
--            has_function_privilege(r.rolname, 'cron.unschedule(text)', 'EXECUTE')       AS can_unschedule,
--            has_function_privilege(r.rolname,
--              'cron.alter_job(bigint,text,text,text,text,boolean)', 'EXECUTE')          AS can_alter
--       FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','authenticator');
--     expect all false. If cron_usage is false the function checks may still read true (PUBLIC EXECUTE)
--     but are unusable without schema USAGE; any true cron_usage or job_any = FAIL, stop and report.
-- Q3b Raw grants on cron objects (to explain any unexpected true above):
--     SELECT n.nspname, c.relname, (aclexplode(c.relacl)).grantee::regrole, (aclexplode(c.relacl)).privilege_type
--       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'cron';
--     SELECT (aclexplode(nspacl)).grantee::regrole, (aclexplode(nspacl)).privilege_type
--       FROM pg_namespace WHERE nspname = 'cron';
-- After the next :17 UTC run:
-- Q4  SELECT runid, status, return_message, start_time, end_time FROM cron.job_run_details
--      WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-rate-limits')
--      ORDER BY start_time DESC LIMIT 3;                         -- expect status 'succeeded'; note start_time = s
-- Q5  Run s = latest succeeded start_time from Q4. Expired is judged at s, not at t0, so rows that
--     expired between t0 and s are included automatically.
--     SELECT count(*) AS left_expired,
--            (SELECT n_tup_del FROM pg_stat_user_tables
--              WHERE schemaname = 'public' AND relname = 'rate_limits') AS del1
--       FROM public.rate_limits
--      WHERE created_at < '<s>'::timestamptz - interval '25 hours';
--     deleted_by_run = del1 - del0 (nothing else deletes from rate_limits while the old
--     purge_expired_records stays unscheduled; take del0 just before a run when checking later runs).
--     PASS     : left_expired = 0.
--     BACKLOG  : left_expired > 0 AND deleted_by_run = 50,000 (run hit its cap). Not a failure; repeat
--                Q4+Q5 after each next run until left_expired = 0. No PASS is declared until then.
--     FAIL     : left_expired > 0 AND deleted_by_run < 50,000, or Q4 status <> 'succeeded'. Stop, report.
--     NOT VERIFIED: if statistics were reset or del1 < del0 (counter unreliable), do not infer counts.
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
-- Only if P7 recorded pre_existing_idx = false (index was created by this migration):
--   DROP INDEX IF EXISTS public.rate_limits_created_at_idx;
-- If P7 showed it already existed: do NOT drop it.
-- Do NOT drop pg_cron (dropping it deletes every cron job; B also needs it).
-- Rows already purged were expired hash entries and cannot be restored.

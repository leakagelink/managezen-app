-- NOT APPLIED. Separate approval required. Depends on purge_expired_rate_limits.sql (pg_cron) being applied first.
-- Deletes ONLY closed deletion requests (Completed / Rejected) whose last update is older than 1 year.
-- Received / Verification Pending / Verified / Processing are never touched.
-- account_deletion_jobs is keyed by user_id and is not touched. audit_log is kept (no foreign key);
-- one 'system' audit row is written per purged request (no email stored in audit_log).

CREATE OR REPLACE FUNCTION public.purge_closed_deletion_requests(_batch integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF _batch < 1 OR _batch > 5000 THEN RAISE EXCEPTION 'Invalid batch'; END IF;
  WITH gone AS (
    DELETE FROM public.deletion_requests d
     WHERE d.id IN (
       SELECT id FROM public.deletion_requests
        WHERE status IN ('Completed','Rejected')
          AND updated_at < now() - interval '1 year'
          AND (status <> 'Completed' OR completed_at IS NOT NULL)
        ORDER BY updated_at
        LIMIT _batch)
    RETURNING d.id, d.status
  )
  INSERT INTO public.audit_log(actor_id, actor_kind, table_name, record_id, old_status, new_status)
  SELECT NULL, 'system', 'deletion_requests', id, status, 'Purged' FROM gone;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.purge_closed_deletion_requests(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_closed_deletion_requests(integer) TO service_role;

-- Schedule: daily 03:23 UTC (08:53 IST). Runs again next day if a batch fails; nothing is half-deleted
-- because each run is one transaction.
SELECT cron.schedule('purge-closed-deletion-requests', '23 3 * * *',
  $job$SELECT public.purge_closed_deletion_requests(500)$job$);

-- Dry run (read-only):
-- SELECT status, count(*) FROM public.deletion_requests
--  WHERE status IN ('Completed','Rejected') AND updated_at < now() - interval '1 year'
--    AND (status <> 'Completed' OR completed_at IS NOT NULL) GROUP BY status;

-- Verify:
-- SELECT jobid, schedule, active FROM cron.job WHERE jobname = 'purge-closed-deletion-requests';
-- SELECT status, return_message, start_time FROM cron.job_run_details
--  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'purge-closed-deletion-requests') ORDER BY start_time DESC LIMIT 5;
-- SELECT count(*) FROM public.audit_log WHERE new_status = 'Purged';

-- Disable: SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'purge-closed-deletion-requests'), active := false);
-- Rollback: SELECT cron.unschedule('purge-closed-deletion-requests');
--           DROP FUNCTION IF EXISTS public.purge_closed_deletion_requests(integer);
-- Note: deleted rows cannot be restored by rollback; only the schedule/function are reversible.

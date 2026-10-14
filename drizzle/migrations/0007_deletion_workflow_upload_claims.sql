-- Upload state machine (replaces files_attached flag).
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS upload_state text NOT NULL DEFAULT 'open';
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS upload_claim uuid;
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS upload_claimed_at timestamptz;
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS upload_attempts integer NOT NULL DEFAULT 0;
UPDATE public.project_requests SET upload_state = 'complete' WHERE files_attached;
COMMENT ON COLUMN public.project_requests.files_attached IS 'DEPRECATED: replaced by upload_state';

-- Atomic claim: only one uploader at a time, max 3 attempts, within 1 hour of submission.
CREATE OR REPLACE FUNCTION public.claim_request_upload(_tracking text, _token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare c uuid := gen_random_uuid(); ok uuid;
begin
  update public.project_requests set upload_state='claimed', upload_claim=c, upload_claimed_at=now(), upload_attempts=upload_attempts+1
  where tracking_code=_tracking and upload_token=_token and created_at > now()-interval '1 hour' and upload_attempts < 3
    and (upload_state in ('open','failed') or (upload_state='claimed' and upload_claimed_at < now()-interval '5 minutes'))
  returning id into ok;
  if ok is null then return null; end if;
  return c;
end $$;
REVOKE EXECUTE ON FUNCTION public.claim_request_upload(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_request_upload(text, uuid) TO service_role;

-- Deletion requests: verification + lifecycle.
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS email_hash text;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS verify_hash text;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS verify_expires_at timestamptz;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS request_no text;
UPDATE public.deletion_requests SET request_no = 'DEL-'||upper(substr(id::text,1,8)) WHERE request_no IS NULL;
ALTER TABLE public.deletion_requests ALTER COLUMN request_no SET DEFAULT 'DEL-'||upper(substr(md5(random()::text),1,8));

-- Admins may only move between review states; Verified/Processing/Completed are set by the server workflow.
CREATE OR REPLACE FUNCTION public.validate_deletion_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare is_service boolean := coalesce(auth.role(),'') = 'service_role' or current_user in ('postgres','service_role');
declare ok boolean;
begin
  if new.email<>old.email and not is_service then raise exception 'Locked field'; end if;
  if (new.verify_hash is distinct from old.verify_hash or new.verified_at is distinct from old.verified_at or new.completed_at is distinct from old.completed_at) and not is_service then raise exception 'Locked field'; end if;
  ok := new.status=old.status
    or (old.status='Received' and new.status in ('Verification Pending','Rejected'))
    or (old.status='Verification Pending' and new.status in ('Verified','Rejected','Verification Pending'))
    or (old.status='Verified' and new.status in ('Processing','Rejected'))
    or (old.status='Processing' and new.status in ('Completed','Verified'));
  if not ok then raise exception 'Status change % -> % not allowed', old.status, new.status; end if;
  if new.status in ('Verified','Processing','Completed') and new.status<>old.status and not is_service then raise exception 'Only the verified workflow can set this status'; end if;
  if new.status<>old.status then
    insert into public.audit_log(actor_id,table_name,record_id,old_status,new_status) values (auth.uid(),'deletion_requests',new.id,old.status,new.status);
  end if;
  new.updated_at := now();
  return new;
end $$;
REVOKE EXECUTE ON FUNCTION public.validate_deletion_request() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS deletion_requests_validate ON public.deletion_requests;
CREATE TRIGGER deletion_requests_validate BEFORE UPDATE ON public.deletion_requests FOR EACH ROW EXECUTE FUNCTION public.validate_deletion_request();

-- Public requests now go through a rate-limited server function.
REVOKE EXECUTE ON FUNCTION public.request_account_deletion(text, text) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.request_account_deletion(text, text) IS 'DEPRECATED: replaced by requestDeletion server function';

-- Rate limits keyed by hashed IP / hashed email (no raw personal data).
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limits_lookup ON public.rate_limits(bucket, key_hash, created_at);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Durable, single-flight account deletion jobs.
CREATE TABLE IF NOT EXISTS public.account_deletion_jobs (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'Running',
  step text NOT NULL DEFAULT 'start',
  last_error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_deletion_jobs TO authenticated;
GRANT ALL ON public.account_deletion_jobs TO service_role;
ALTER TABLE public.account_deletion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads deletion jobs" ON public.account_deletion_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.claim_deletion_job(_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare n int;
begin
  insert into public.account_deletion_jobs(user_id) values (_user)
  on conflict (user_id) do update set status='Running', updated_at=now(), last_error=null
    where account_deletion_jobs.status='Failed' or (account_deletion_jobs.status='Running' and account_deletion_jobs.updated_at < now()-interval '10 minutes');
  get diagnostics n = row_count;
  return n > 0;
end $$;
REVOKE EXECUTE ON FUNCTION public.claim_deletion_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_deletion_job(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  select id from auth.users where lower(email)=lower(trim(_email)) limit 1
$$;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO service_role;

-- Retention: rate-limit rows after 1 day; closed deletion requests after 1 year.
CREATE OR REPLACE FUNCTION public.purge_expired_records()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  delete from public.rate_limits where created_at < now()-interval '1 day';
  delete from public.deletion_requests where status in ('Completed','Rejected') and updated_at < now()-interval '1 year';
$$;
REVOKE EXECUTE ON FUNCTION public.purge_expired_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_records() TO service_role;
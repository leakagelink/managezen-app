ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_kind text;
COMMENT ON COLUMN public.audit_log.actor_kind IS 'admin | requester (email-link owner) | system. NULL on rows written before attribution existed.';

-- Resolve the real actor: the signed-in caller, or the verified admin id set by a server-only RPC in the same transaction.
CREATE OR REPLACE FUNCTION public.audit_actor()
RETURNS uuid LANGUAGE sql STABLE SET search_path = public AS $$
  select coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid)
$$;
REVOKE EXECUTE ON FUNCTION public.audit_actor() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.validate_status_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare ok boolean := false; actor uuid := public.audit_actor();
begin
  if new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at then raise exception 'Locked field'; end if;
  if TG_TABLE_NAME='offers' then
    if new.price<>old.price or new.base<>old.base or new.code<>old.code or new.service<>old.service then raise exception 'Locked field'; end if;
    ok := new.status=old.status or (old.status in ('Pending approval','Draft') and new.status in ('Active','Rejected')) or (old.status='Active' and new.status='Rejected');
  elsif TG_TABLE_NAME='referrals' then
    if new.fee<>old.fee then raise exception 'Locked field'; end if;
    ok := new.status=old.status or (old.status='Pending' and new.status in ('Approved','Rejected')) or (old.status='Approved' and new.status in ('Completed','Rejected'));
  elsif TG_TABLE_NAME='payout_requests' then
    if new.amount<>old.amount or new.method<>old.method or new.details<>old.details then raise exception 'Locked field'; end if;
    ok := new.status=old.status or (old.status='Pending' and new.status in ('Approved','Rejected'));
  end if;
  if not ok then raise exception 'Status change % -> % not allowed', old.status, new.status; end if;
  if new.status<>old.status then
    -- Fail closed: a status decision needs a verified admin identity.
    if actor is null or not public.has_role(actor, 'admin') then raise exception 'Admin identity required'; end if;
    insert into public.audit_log(actor_id,actor_kind,table_name,record_id,old_status,new_status) values (actor,'admin',TG_TABLE_NAME,new.id,old.status,new.status);
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.validate_deletion_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  is_service boolean := coalesce(auth.role(),'') = 'service_role' or current_user in ('postgres','service_role');
  actor uuid := public.audit_actor();
  kind text := nullif(current_setting('app.actor_kind', true), '');
  ok boolean;
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
    if old.status='Verification Pending' and new.status='Verified' then
      if kind is distinct from 'requester' then raise exception 'Verification must come from the email link'; end if;
      insert into public.audit_log(actor_id,actor_kind,table_name,record_id,old_status,new_status) values (null,'requester','deletion_requests',new.id,old.status,new.status);
    else
      if actor is null or not public.has_role(actor,'admin') then raise exception 'Admin identity required'; end if;
      insert into public.audit_log(actor_id,actor_kind,table_name,record_id,old_status,new_status) values (actor,'admin','deletion_requests',new.id,old.status,new.status);
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Server-only: applies a deletion-request change attributed to a server-verified actor, in one transaction.
CREATE OR REPLACE FUNCTION public.svc_update_deletion_request(_id uuid, _actor uuid, _actor_kind text, _from text[], _patch jsonb)
RETURNS SETOF public.deletion_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if _actor_kind not in ('admin','requester') then raise exception 'Invalid actor kind'; end if;
  if _actor_kind='admin' and (_actor is null or not public.has_role(_actor,'admin')) then raise exception 'Admin identity required'; end if;
  perform set_config('app.actor_id', coalesce(_actor::text,''), true);
  perform set_config('app.actor_kind', _actor_kind, true);
  return query
  update public.deletion_requests d set
    status = coalesce(_patch->>'status', d.status),
    verify_hash = case when _patch ? 'verify_hash' then _patch->>'verify_hash' else d.verify_hash end,
    verify_expires_at = case when _patch ? 'verify_expires_at' then (_patch->>'verify_expires_at')::timestamptz else d.verify_expires_at end,
    verified_at = case when _patch ? 'verified_at' then (_patch->>'verified_at')::timestamptz else d.verified_at end,
    completed_at = case when _patch ? 'completed_at' then (_patch->>'completed_at')::timestamptz else d.completed_at end,
    email = coalesce(_patch->>'email', d.email),
    reason = coalesce(_patch->>'reason', d.reason)
  where d.id=_id and d.status = any(_from)
  returning d.*;
end $$;
REVOKE EXECUTE ON FUNCTION public.svc_update_deletion_request(uuid,uuid,text,text[],jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.svc_update_deletion_request(uuid,uuid,text,text[],jsonb) TO service_role;

-- Audit log stays append-only.
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM anon, authenticated;
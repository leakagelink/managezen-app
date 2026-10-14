-- 1. Storage: remove open anonymous uploads; uploads now go through a verified server function.
DROP POLICY IF EXISTS "Anyone can upload project files" ON storage.objects;

-- One-time upload token per request so only the submitter can attach files.
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS upload_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS files_attached boolean NOT NULL DEFAULT false;
COMMENT ON FUNCTION public.attach_request_files(text, text[]) IS 'DEPRECATED: replaced by server-side upload function; no client execute rights.';
REVOKE EXECUTE ON FUNCTION public.attach_request_files(text, text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_project_request_v2(_offer_code text, _name text, _email text, _phone text, _country text, _requirements text)
RETURNS TABLE(tracking_code text, upload_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare c text;
begin
  c := public.submit_project_request(_offer_code,_name,_email,_phone,_country,_requirements);
  return query select r.tracking_code, r.upload_token from public.project_requests r where r.tracking_code = c;
end $$;
REVOKE EXECUTE ON FUNCTION public.submit_project_request_v2(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_project_request_v2(text,text,text,text,text,text) TO anon, authenticated;

-- 2. Least privilege on internal functions (triggers still run).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_project_customer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Audit log (admin-readable, written only by triggers).
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Server-side earnings (verified math).
CREATE OR REPLACE FUNCTION public.available_payout(_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select coalesce((select sum(price-base) from public.offers where user_id=_user and status='Active'),0)
       + coalesce((select sum(round(fee*0.20)) from public.referrals where user_id=_user and status='Completed'),0)
       - coalesce((select sum(amount) from public.payout_requests where user_id=_user and status in ('Pending','Approved')),0)
$$;
REVOKE EXECUTE ON FUNCTION public.available_payout(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_available_payout()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ select public.available_payout(auth.uid()) $$;
REVOKE EXECUTE ON FUNCTION public.my_available_payout() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_available_payout() TO authenticated;

-- 5. Integrity triggers: inserts.
CREATE OR REPLACE FUNCTION public.validate_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare catalog numeric;
begin
  if TG_TABLE_NAME='offers' then
    catalog := case new.service when 'Business website' then 10000 when 'Mobile app' then 10000 when 'Website + App combo' then 20000 when 'Brand identity' then 10000 else null end;
    if catalog is null then raise exception 'Unknown service'; end if;
    if new.base < catalog then raise exception 'Base price below approved base'; end if;
    if new.price <= new.base or new.price > 10000000 then raise exception 'Invalid price'; end if;
    new.reason := null;
  elsif TG_TABLE_NAME='referrals' then
    if new.fee < 0 or new.fee > 10000000 then raise exception 'Invalid project value'; end if;
    new.status := 'Pending';
  elsif TG_TABLE_NAME='payout_requests' then
    new.status := 'Pending';
    if new.amount <= 0 then raise exception 'Invalid amount'; end if;
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    if new.amount > public.available_payout(new.user_id) then raise exception 'Amount exceeds available earnings'; end if;
  end if;
  new.created_at := now();
  return new;
end $$;
REVOKE EXECUTE ON FUNCTION public.validate_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS offers_validate_insert ON public.offers;
CREATE TRIGGER offers_validate_insert BEFORE INSERT ON public.offers FOR EACH ROW EXECUTE FUNCTION public.validate_insert();
DROP TRIGGER IF EXISTS referrals_validate_insert ON public.referrals;
CREATE TRIGGER referrals_validate_insert BEFORE INSERT ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.validate_insert();
DROP TRIGGER IF EXISTS payouts_validate_insert ON public.payout_requests;
CREATE TRIGGER payouts_validate_insert BEFORE INSERT ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.validate_insert();

-- 6. Integrity triggers: updates (locked financial columns, allowed transitions, audit).
CREATE OR REPLACE FUNCTION public.validate_status_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare ok boolean := false;
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
    insert into public.audit_log(actor_id,table_name,record_id,old_status,new_status) values (auth.uid(),TG_TABLE_NAME,new.id,old.status,new.status);
  end if;
  return new;
end $$;
REVOKE EXECUTE ON FUNCTION public.validate_status_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS offers_validate_update ON public.offers;
CREATE TRIGGER offers_validate_update BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.validate_status_update();
DROP TRIGGER IF EXISTS referrals_validate_update ON public.referrals;
CREATE TRIGGER referrals_validate_update BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.validate_status_update();
DROP TRIGGER IF EXISTS payouts_validate_update ON public.payout_requests;
CREATE TRIGGER payouts_validate_update BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.validate_status_update();

-- Profiles: users can only edit their own non-identity fields.
CREATE OR REPLACE FUNCTION public.lock_profile_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
  if new.id<>old.id or new.created_at<>old.created_at then raise exception 'Locked field'; end if;
  if length(new.legal_name)>100 or length(new.phone)>25 or length(new.country)>2 or length(new.currency)>3 then raise exception 'Invalid input'; end if;
  new.updated_at := now(); return new;
end $$;
REVOKE EXECUTE ON FUNCTION public.lock_profile_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_lock ON public.profiles;
CREATE TRIGGER profiles_lock BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.lock_profile_fields();

-- 7. External (signed-out) account deletion requests.
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Received',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.deletion_requests TO authenticated;
GRANT ALL ON public.deletion_requests TO service_role;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads deletion requests" ON public.deletion_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin updates deletion requests" ON public.deletion_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.request_account_deletion(_email text, _reason text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare c text;
begin
  if _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(_email)>255 or length(coalesce(_reason,''))>500 then raise exception 'Invalid input'; end if;
  if (select count(*) from public.deletion_requests where lower(email)=lower(trim(_email)) and created_at>now()-interval '1 day') >= 3 then raise exception 'Too many requests'; end if;
  insert into public.deletion_requests(email,reason) values (lower(trim(_email)),coalesce(_reason,'')) returning upper(substr(id::text,1,8)) into c;
  return 'DEL-'||c;
end $$;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text,text) TO anon, authenticated;
CREATE TABLE public.referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 client_name text NOT NULL,
 client_contact text NOT NULL DEFAULT '',
 service text NOT NULL,
 fee numeric NOT NULL DEFAULT 0 CHECK (fee >= 0),
 status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Completed','Rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referral owner or admin read" ON public.referrals FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Referrer submits referral" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND status='Pending' AND (public.has_role(auth.uid(),'referrer') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Admin updates referrals" ON public.referrals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tracking_code text NOT NULL UNIQUE DEFAULT ('SOC-' || to_char(now(),'YYYY') || '-' || upper(substr(md5(random()::text),1,5))),
 customer_id uuid,
 customer_email text NOT NULL DEFAULT '',
 service text NOT NULL,
 total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
 stage text NOT NULL DEFAULT 'Project accepted',
 progress int NOT NULL DEFAULT 10 CHECK (progress BETWEEN 0 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project customer or admin read" ON public.projects FOR SELECT TO authenticated USING (auth.uid()=customer_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin creates projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin updates projects" ON public.projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Link a project to a customer account by email on insert
CREATE OR REPLACE FUNCTION public.link_project_customer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
begin
 if new.customer_id is null and new.customer_email <> '' then
  select id into new.customer_id from auth.users where lower(email)=lower(new.customer_email) limit 1;
 end if;
 new.updated_at := now();
 return new;
end $$;
CREATE TRIGGER projects_link_customer BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.link_project_customer();

-- Public tracking: only non-private fields
CREATE OR REPLACE FUNCTION public.track_project(_code text) RETURNS TABLE(tracking_code text, service text, stage text, progress int, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 select p.tracking_code, p.service, p.stage, p.progress, p.updated_at from public.projects p where upper(p.tracking_code)=upper(trim(_code)) limit 1
$$;
GRANT EXECUTE ON FUNCTION public.track_project(text) TO anon, authenticated;

CREATE TABLE public.payout_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 amount numeric NOT NULL CHECK (amount > 0),
 method text NOT NULL DEFAULT 'UPI',
 details text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payout owner or admin read" ON public.payout_requests FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Partner requests payout" ON public.payout_requests FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND status='Pending');
CREATE POLICY "Admin decides payouts" ON public.payout_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 title text NOT NULL,
 body text NOT NULL DEFAULT '',
 read boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "Own notifications mark read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.notify_status_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
declare who uuid; label text;
begin
 if TG_TABLE_NAME='projects' then
  if new.customer_id is null or (TG_OP='UPDATE' and new.stage is not distinct from old.stage) then return new; end if;
  insert into public.notifications(user_id,title,body) values (new.customer_id,'Project update: '||new.stage, new.service||' · '||new.tracking_code);
  return new;
 end if;
 if TG_OP='UPDATE' and new.status is not distinct from old.status then return new; end if;
 if TG_TABLE_NAME='offers' then label := 'Offer '||new.code;
 elsif TG_TABLE_NAME='referrals' then label := 'Referral for '||new.client_name;
 else label := 'Payout request'; end if;
 insert into public.notifications(user_id,title,body) values (new.user_id, label||' is now '||new.status, coalesce(case when TG_TABLE_NAME='offers' then new.reason end,''));
 return new;
end $$;
CREATE TRIGGER offers_notify AFTER UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();
CREATE TRIGGER referrals_notify AFTER UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();
CREATE TRIGGER payouts_notify AFTER UPDATE ON public.payout_requests FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();
CREATE TRIGGER projects_notify AFTER INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();
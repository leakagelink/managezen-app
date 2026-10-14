CREATE TABLE public.project_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tracking_code text NOT NULL UNIQUE DEFAULT ('SOC-'||to_char(now(),'YYYY')||'-'||upper(substr(md5(random()::text),1,5))),
 offer_code text NOT NULL DEFAULT '',
 service text NOT NULL,
 total numeric NOT NULL DEFAULT 0,
 client_name text NOT NULL,
 client_email text NOT NULL,
 client_phone text NOT NULL DEFAULT '',
 country text NOT NULL DEFAULT 'IN',
 requirements text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'New',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.project_requests TO authenticated;
GRANT ALL ON public.project_requests TO service_role;
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads requests" ON public.project_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin updates requests" ON public.project_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'IN';

CREATE OR REPLACE FUNCTION public.submit_project_request(_offer_code text,_name text,_email text,_phone text,_country text,_requirements text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare o record; code text;
begin
 if length(trim(_name)) < 2 or length(_name) > 100 then raise exception 'Invalid name'; end if;
 if _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(_email) > 255 then raise exception 'Invalid email'; end if;
 if length(coalesce(_phone,'')) > 20 or length(coalesce(_requirements,'')) > 2000 or length(coalesce(_country,'')) > 2 then raise exception 'Invalid input'; end if;
 select * into o from public.offers where upper(offers.code)=upper(_offer_code) and status='Active' limit 1;
 if o is null then raise exception 'Offer not available'; end if;
 insert into public.project_requests(offer_code,service,total,client_name,client_email,client_phone,country,requirements)
 values (o.code,o.service,o.price,trim(_name),lower(trim(_email)),coalesce(_phone,''),upper(coalesce(nullif(_country,''),'IN')),coalesce(_requirements,''))
 returning tracking_code into code;
 return code;
end $$;
GRANT EXECUTE ON FUNCTION public.submit_project_request(text,text,text,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_request(_code text)
RETURNS TABLE(tracking_code text, service text, stage text, progress integer, country text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 select p.tracking_code,p.service,p.stage,p.progress,p.country,p.updated_at from public.projects p where upper(p.tracking_code)=upper(trim(_code))
 union all
 select r.tracking_code,r.service,case when r.status='Rejected' then 'Request declined' else 'Request received — awaiting review' end,0,r.country,r.created_at
 from public.project_requests r where upper(r.tracking_code)=upper(trim(_code)) and not exists (select 1 from public.projects p2 where upper(p2.tracking_code)=upper(r.tracking_code))
 limit 1
$$;
GRANT EXECUTE ON FUNCTION public.track_request(text) TO anon, authenticated;
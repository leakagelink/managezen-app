CREATE OR REPLACE FUNCTION public.notify_status_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
declare label text; extra text := '';
begin
 if TG_TABLE_NAME='projects' then
  if new.customer_id is null or (TG_OP='UPDATE' and new.stage is not distinct from old.stage) then return new; end if;
  insert into public.notifications(user_id,title,body) values (new.customer_id,'Project update: '||new.stage, new.service||' · '||new.tracking_code);
  return new;
 end if;
 if TG_OP='UPDATE' and new.status is not distinct from old.status then return new; end if;
 if TG_TABLE_NAME='offers' then label := 'Offer '||new.code; extra := coalesce(new.reason,'');
 elsif TG_TABLE_NAME='referrals' then label := 'Referral for '||new.client_name;
 else label := 'Payout request'; end if;
 insert into public.notifications(user_id,title,body) values (new.user_id, label||' is now '||new.status, extra);
 return new;
end $$;
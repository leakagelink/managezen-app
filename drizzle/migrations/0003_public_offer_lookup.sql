-- Public, privacy-safe offer lookup for shared offer links.
-- Returns only non-private fields of ACTIVE offers; base price and owner stay inside the database.
create or replace function public.get_public_offer(_code text)
returns table (code text, title text, service text, price numeric, status text)
language sql
stable
security definer
set search_path = public
as $$
  select o.code, o.title, o.service, o.price, o.status
  from public.offers o
  where upper(o.code) = upper(_code)
    and o.status = 'Active'
  limit 1
$$;

grant execute on function public.get_public_offer(text) to anon;
grant execute on function public.get_public_offer(text) to authenticated;
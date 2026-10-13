create type public.app_role as enum ('admin','reseller','referrer','customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legal_name text not null default '',
  country text not null default 'IN',
  phone text not null default '',
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Own profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "Own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  code text not null default ('OFF-' || upper(substr(md5(random()::text),1,6))),
  user_id uuid not null,
  title text not null,
  service text not null,
  base numeric not null check (base > 0),
  price numeric not null,
  status text not null default 'Pending approval' check (status in ('Pending approval','Active','Rejected','Draft')),
  reason text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.offers to authenticated;
grant all on public.offers to service_role;
alter table public.offers enable row level security;
create policy "Offer owner or admin read" on public.offers for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "Reseller submits own offer" on public.offers for insert to authenticated with check (auth.uid() = user_id and status in ('Pending approval','Draft') and price > base and (public.has_role(auth.uid(),'reseller') or public.has_role(auth.uid(),'admin')));
create policy "Admin decides offers" on public.offers for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','customer');
begin
  insert into public.profiles (id, legal_name, country, phone, currency)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'legal_name', new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'country','IN'),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'currency','INR'));
  if r not in ('reseller','referrer','customer') then r := 'customer'; end if;
  insert into public.user_roles (user_id, role) values (new.id, r::public.app_role);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
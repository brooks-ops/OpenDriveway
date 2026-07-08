-- OpenDriveway Supabase account + host setup.
-- Run this in the Supabase SQL Editor or with `supabase db push`.
--
-- This migration is intentionally idempotent so it is safe to run after
-- creating a fresh Supabase project. It creates the public profile table that
-- mirrors auth.users, role handling for drivers/hosts/admins, host-specific
-- onboarding state, and RLS policies for browser-side reads/updates.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('driver', 'host', 'admin');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'driver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.host_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text,
  phone text,
  stripe_account_id text unique,
  onboarding_complete boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_users_email on public.users(email);
create index if not exists ix_users_role on public.users(role);
create index if not exists ix_host_profiles_stripe_account_id on public.host_profiles(stripe_account_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists host_profiles_set_updated_at on public.host_profiles;
create trigger host_profiles_set_updated_at
before update on public.host_profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'driver'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.users.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.become_host()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.users;
begin
  update public.users
  set role = 'host'
  where id = auth.uid()
    and role <> 'admin'
  returning * into profile;

  if profile.id is null then
    select * into profile from public.users where id = auth.uid();
  end if;

  insert into public.host_profiles (user_id, display_name)
  values (auth.uid(), profile.full_name)
  on conflict (user_id) do nothing;

  return profile;
end;
$$;

alter table public.users enable row level security;
alter table public.host_profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
on public.users for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update their own non-admin profile fields" on public.users;
create policy "Users can update their own non-admin profile fields"
on public.users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and role <> 'admin');

drop policy if exists "Hosts can read their own host profile" on public.host_profiles;
create policy "Hosts can read their own host profile"
on public.host_profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Hosts can insert their own host profile" on public.host_profiles;
create policy "Hosts can insert their own host profile"
on public.host_profiles for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.users
    where users.id = auth.uid()
      and users.role in ('host', 'admin')
  )
);

drop policy if exists "Hosts can update their own host profile" on public.host_profiles;
create policy "Hosts can update their own host profile"
on public.host_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.users to authenticated;
grant update (full_name) on public.users to authenticated;
grant select, insert, update on public.host_profiles to authenticated;
grant execute on function public.become_host() to authenticated;

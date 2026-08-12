-- 0001_profiles.sql
-- auth.users 와 1:1 연결되는 기본 프로필 + 역할

create extension if not exists "pgcrypto";

create type public.app_role as enum ('USER', 'CONSULTANT', 'ADMIN', 'SUPER_ADMIN');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  phone text,
  email text,
  birth_year integer,
  gender text,
  region_sido text,
  region_sigungu text,
  role public.app_role not null default 'USER',
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  privacy_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.user_acquisition (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  first_touch_at timestamptz not null default now(),
  last_touch_at timestamptz not null default now(),
  unique (user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('ADMIN', 'SUPER_ADMIN', 'CONSULTANT')
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid and ur.role in ('ADMIN', 'SUPER_ADMIN', 'CONSULTANT')
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('ADMIN', 'SUPER_ADMIN')
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid and ur.role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

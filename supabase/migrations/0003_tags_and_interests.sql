-- 0003_tags_and_interests.sql
-- 범용 Tag + 자격/직업 관심 구조

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.user_tags (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  source text,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create table if not exists public.qualifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  category text,
  issuer text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.user_qualifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  qualification_id uuid not null references public.qualifications (id) on delete cascade,
  status text not null default 'held',
  acquired_at date,
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, qualification_id)
);

create table if not exists public.user_qualification_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  qualification_id uuid not null references public.qualifications (id) on delete cascade,
  interest_score integer not null default 1,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, qualification_id)
);

create table if not exists public.occupations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  is_midcareer_friendly boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.user_job_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occupation_id uuid not null references public.occupations (id) on delete cascade,
  interest_score integer not null default 1,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, occupation_id)
);

create table if not exists public.user_content_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null,
  interest_score integer not null default 1,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

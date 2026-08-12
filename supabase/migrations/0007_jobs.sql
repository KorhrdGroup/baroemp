-- 0007_jobs.sql

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_name text not null default '',
  job_category text not null default 'other',
  region text,
  location_detail text,
  work_type text,
  salary_text text,
  is_beginner_friendly boolean not null default false,
  preferred_qualifications jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  description text not null default '',
  midlife_recommendation_score numeric(3,1),
  occupation_id uuid references public.occupations (id) on delete set null,
  status text not null default 'draft',
  apply_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_tags (
  job_id uuid not null references public.jobs (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (job_id, tag_id)
);

create table if not exists public.job_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

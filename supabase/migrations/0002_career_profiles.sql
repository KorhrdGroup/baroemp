-- 0002_career_profiles.sql
-- 1 User = 1 Career Profile (영업 가능한 Career DB 핵심)

create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  employment_status text,
  education_level text,
  career_years numeric(5,1),
  career_break_months integer,
  desired_salary_min integer,
  desired_salary_max integer,
  desired_employment_type text,
  desired_work_schedule text,
  desired_employment_date date,
  desired_start_timing text,
  has_driver_license boolean default false,
  can_drive boolean default false,
  education_willingness boolean,
  career_change_willingness boolean,
  preferred_region text,
  age_group text,
  employment_barriers jsonb not null default '[]'::jsonb,
  interest_tags jsonb not null default '[]'::jsonb,
  desired_job_categories jsonb not null default '[]'::jsonb,
  desired_work_types jsonb not null default '[]'::jsonb,
  notes text,
  profile_completeness integer not null default 0 check (profile_completeness between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_career_profiles_updated_at on public.career_profiles;
create trigger trg_career_profiles_updated_at
  before update on public.career_profiles
  for each row execute function public.set_updated_at();

-- 0042_step7_5_job_requirements.sql
-- STEP 7.5: Job Requirement 표준화 (스펙 5/7번).
-- 기존 jobs 테이블은 수정하지 않고 컬럼만 추가한다 (분류 결과를 저장해 매 요청마다
-- 전체 jobs를 다시 스캔하지 않도록 하기 위함 - 스펙 53번 성능 요구사항).

alter table public.jobs
  add column if not exists employment_destination_id uuid references public.employment_destinations (id) on delete set null;

create index if not exists idx_jobs_employment_destination on public.jobs (employment_destination_id);
create index if not exists idx_jobs_occupation_active_posted on public.jobs (occupation_code, is_active, posted_at desc);

create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  requirement_id uuid not null references public.career_requirements (id) on delete cascade,
  requirement_level text not null check (requirement_level in ('REQUIRED', 'PREFERRED', 'MENTIONED')),
  source_text text,
  confidence numeric(4, 2) not null default 1.0,
  created_at timestamptz not null default now(),
  unique (job_id, requirement_id)
);

create index if not exists idx_job_requirements_job on public.job_requirements (job_id);
create index if not exists idx_job_requirements_requirement on public.job_requirements (requirement_id, requirement_level);

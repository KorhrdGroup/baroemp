-- 0035_step7_resume_builder.sql
-- STEP 7: 이력서 Builder 핵심 DB.
-- 기존 0009_resumes.sql의 resumes 테이블(STEP1, "업로드 후 AI 첨삭" mock 전용, 실사용 데이터 없음)을
-- 그대로 재사용/확장한다. 기존 컬럼(document_type/file_name/review_status/feedback_items)은
-- 삭제하지 않고 nullable로 완화만 하여 하위호환을 유지한다.

alter table public.resumes
  alter column document_type drop not null,
  add column if not exists template_id uuid references public.resume_templates (id),
  add column if not exists target_job_id uuid references public.jobs (id) on delete set null,
  add column if not exists target_occupation_id uuid references public.occupations (id) on delete set null,
  add column if not exists summary text,
  add column if not exists desired_job_title text,
  add column if not exists desired_region text,
  add column if not exists status text not null default 'draft',
  add column if not exists is_primary boolean not null default false,
  add column if not exists version integer not null default 1,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists photo_url text,
  add column if not exists portfolio_url text,
  add column if not exists completeness integer not null default 0;

comment on column public.resumes.document_type is '[DEPRECATED-STEP1] 업로드 기반 첨삭 mock 전용. STEP7 Builder는 template_id를 사용한다.';
comment on column public.resumes.file_name is '[DEPRECATED-STEP1] 업로드 기반 첨삭 mock 전용.';

create index if not exists idx_resumes_user on public.resumes (user_id, updated_at desc);
create index if not exists idx_resumes_target_job on public.resumes (target_job_id);

-- 한 회원이 대표 이력서를 여러개 가질 수 없도록 부분 unique index (is_primary = true 인 행만 검사)
create unique index if not exists uq_resumes_one_primary_per_user
  on public.resumes (user_id)
  where is_primary = true;

create table if not exists public.resume_educations (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  school_name text not null,
  education_type text,
  major text,
  degree text,
  admission_date date,
  graduation_date date,
  graduation_status text,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_resume_educations_resume on public.resume_educations (resume_id, order_index);

create table if not exists public.resume_experiences (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  company_name text not null,
  department text,
  position text,
  employment_type text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  job_title text,
  responsibilities text,
  achievements text,
  reason_for_leaving text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_resume_experiences_resume on public.resume_experiences (resume_id, order_index);

-- 이력서 자격증: 기존 STEP2 qualifications/user_qualifications 카탈로그와 연동 가능하도록
-- user_qualification_id를 nullable로 보존한다 (Resume -> Career DB Merge Service가 채워준다).
create table if not exists public.resume_qualifications (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  name text not null,
  issuer text,
  acquired_at date,
  license_number text,
  expires_at date,
  user_qualification_id uuid references public.user_qualifications (id) on delete set null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_resume_qualifications_resume on public.resume_qualifications (resume_id, order_index);

create table if not exists public.resume_trainings (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  course_name text not null,
  institution text,
  start_date date,
  end_date date,
  content text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_resume_trainings_resume on public.resume_trainings (resume_id, order_index);

create table if not exists public.resume_skills (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_resume_skills_resume on public.resume_skills (resume_id, order_index);

-- 수상/프로젝트/대외활동/봉사/외국어 등 선택항목을 section_type으로 구분해 한 테이블로 관리한다
-- (모든 사용자에게 강제하지 않는 부가 항목이라 테이블을 세분화하지 않음. 스펙 11/15번의
-- PROJECT/ACTIVITY section과 매핑된다).
create table if not exists public.resume_items (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  section_type text not null check (section_type in ('AWARD', 'PROJECT', 'ACTIVITY', 'VOLUNTEER', 'LANGUAGE')),
  title text not null,
  organization text,
  period_start date,
  period_end date,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_resume_items_resume on public.resume_items (resume_id, section_type, order_index);

-- 수정/AI 첨삭 반복 시 이전 내용을 복구할 수 있도록 하는 snapshot 버전 기록.
create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  change_type text not null default 'MANUAL' check (change_type in ('MANUAL', 'AI_REVIEW', 'AI_REWRITE', 'IMPORT')),
  created_at timestamptz not null default now()
);
create index if not exists idx_resume_versions_resume on public.resume_versions (resume_id, version desc);

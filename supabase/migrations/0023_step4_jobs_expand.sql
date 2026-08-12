-- 0023_step4_jobs_expand.sql
-- STEP 4: 전국 채용공고 - 외부 Provider(고용24 Work24 등) 연동을 위한 jobs 컬럼 확장.
-- 기존 0007_jobs.sql / 0020_step3_5_jobs_readiness.sql은 수정하지 않고 새 컬럼만 추가한다.

alter table public.jobs
  add column if not exists business_registration_number text,
  add column if not exists industry_name text,
  add column if not exists occupation_code text,
  add column if not exists occupation_name text,
  add column if not exists region_sigungu text,
  add column if not exists address text,
  add column if not exists zip_code text,
  add column if not exists employment_type_code text,
  add column if not exists salary_type text,
  add column if not exists career_requirement text,
  add column if not exists education_requirement text,
  add column if not exists qualification_requirements text,
  add column if not exists work_hours text,
  add column if not exists work_days text,
  add column if not exists posted_at timestamptz,
  add column if not exists is_active boolean not null default true,
  add column if not exists closed_at timestamptz,
  add column if not exists mobile_source_url text,
  add column if not exists preferential_codes jsonb not null default '[]'::jsonb,
  add column if not exists source_updated_at timestamptz;

comment on column public.jobs.apply_url is
  'STEP 4: 원본 채용공고 상세 URL(sourceUrl)로도 사용한다. 지원하러 가기 버튼이 이 URL로 이동한다.';
comment on column public.jobs.preferential_codes is
  'Work24 pfPreferential 코드 배열. 중장년 특화 우대조건(14=운전가능자, B=(준)고령자 50세 이상 등)을 그대로 보존한다.';
comment on column public.jobs.is_active is
  '외부 Provider에서 더 이상 노출되지 않거나(closeDt 경과) 관리자가 내린 공고를 삭제 대신 비활성화하는 플래그.';

-- 채용공고를 등록한 회사가 이미 있음을 가정하지 않으므로 기존 데이터는 전부 활성 상태로 간주한다.
update public.jobs set is_active = true where is_active is null;

-- 마감일이 지난 기존 공고는 이번 migration 시점에 1회성으로 비활성화한다 (이후에는 Job Sync Service가 관리).
update public.jobs
  set is_active = false, closed_at = coalesce(closed_at, now())
  where apply_deadline is not null and apply_deadline < now() and is_active = true;

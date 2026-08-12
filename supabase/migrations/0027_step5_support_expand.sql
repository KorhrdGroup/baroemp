-- 0027_step5_support_expand.sql
-- STEP 5: 지원금 찾기 - 외부 Provider(행안부 공공서비스 등) 연동을 위한 support_programs 컬럼 확장.
-- 기존 0008_support_programs.sql은 수정하지 않고 새 컬럼만 추가한다.

alter table public.support_programs
  add column if not exists category text not null default 'other',
  add column if not exists target_description text,
  add column if not exists target_age_min integer,
  add column if not exists target_age_max integer,
  add column if not exists region_scope text,
  add column if not exists employment_status_targets jsonb not null default '[]'::jsonb,
  add column if not exists income_condition text,
  add column if not exists career_condition text,
  add column if not exists household_condition text,
  add column if not exists education_condition text,
  add column if not exists job_condition text,
  add column if not exists eligibility_raw text,
  add column if not exists benefit_description text,
  add column if not exists support_amount_text text,
  add column if not exists application_period text,
  add column if not exists application_start_at timestamptz,
  add column if not exists application_end_at timestamptz,
  add column if not exists application_method text,
  add column if not exists required_documents jsonb not null default '[]'::jsonb,
  add column if not exists organization_name text,
  add column if not exists department_name text,
  add column if not exists contact text,
  add column if not exists related_qualification_codes jsonb not null default '[]'::jsonb,
  add column if not exists source_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists closed_at timestamptz,
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists raw_payload jsonb,
  add column if not exists fetched_at timestamptz;

-- 기존 데이터 호환: organization_name이 비어있으면 기존 organization 값을 그대로 채운다.
update public.support_programs set organization_name = organization where organization_name is null;

-- (external_source, external_id) 조합 기준 중복 수집 방지. 직접등록/구버전 데이터는 둘 다 null이라
-- unique index를 partial(둘 다 not null)로 걸어야 여러 개의 null 조합이 충돌하지 않는다.
create unique index if not exists uq_support_programs_external
  on public.support_programs (external_source, external_id)
  where external_source is not null and external_id is not null;

comment on column public.support_programs.is_active is
  '외부 Provider에서 더 이상 노출되지 않거나 마감된 지원제도를 삭제 대신 비활성화하는 플래그.';
comment on column public.support_programs.eligibility_raw is
  '외부 API가 자연어 대상조건만 제공하는 경우를 대비해 항상 원문을 보존한다 (구조화 Rule과 별개).';
comment on column public.support_programs.region_scope is
  '"national" 이면 전국 대상. 그 외에는 Region 코드 1개(대표 지역)를 저장하고, 세부 다중 지역은 target_regions(jsonb)를 사용한다.';

-- 마감일이 지난 기존 데이터는 이번 migration 시점에 1회성으로 비활성화한다 (이후에는 Support Sync Service가 관리).
update public.support_programs
  set is_active = false, closed_at = coalesce(closed_at, now())
  where application_end_at is not null and application_end_at < now() and is_active = true;

-- 0020_step3_5_jobs_readiness.sql
-- STEP 3.5 [11. 다음 STEP 대비] jobs Repository 구조 Audit 결과 보완.
-- STEP 4에서 "External Provider -> Normalize -> jobs DB -> User Interaction -> Activity -> Career Interest"
-- 흐름을 붙일 때 스키마 변경(마이그레이션) 없이 바로 데이터를 채울 수 있도록
-- 외부 공고 수집에 필요한 컬럼과 중복 방지 제약을 지금 추가해 둔다.
-- 이번 STEP에서는 외부 API를 실제로 연결하지 않는다 (컬럼만 준비).

alter table public.jobs
  add column if not exists source text not null default 'direct'
    check (source in ('direct', 'partner', 'public_job_board')),
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists raw_payload jsonb,
  add column if not exists fetched_at timestamptz,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists apply_deadline timestamptz;

comment on column public.jobs.external_source is
  'STEP 4 외부 채용공고 API Provider 식별자 (예: work24, saramin 등). direct/partner 소스는 null.';
comment on column public.jobs.external_id is
  'Provider 측 원본 공고 ID. 재수집 시 upsert 기준 키로 사용.';
comment on column public.jobs.raw_payload is
  'Provider 원본 응답(jsonb) 스냅샷. Normalize 로직 변경/디버깅 시 재현용.';

-- 동일 Provider의 동일 공고가 중복 적재되지 않도록 방지.
create unique index if not exists jobs_external_source_id_uidx
  on public.jobs (external_source, external_id)
  where external_source is not null and external_id is not null;

-- 채용공고 검색/목록에서 자주 쓰는 조합 인덱스.
create index if not exists idx_jobs_category_region_status
  on public.jobs (job_category, region, status);

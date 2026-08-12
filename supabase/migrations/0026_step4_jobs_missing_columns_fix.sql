-- 0026_step4_jobs_missing_columns_fix.sql
-- STEP 4 실제 Supabase 적용 중 발견된 누락 컬럼 보정.
-- 0023_step4_jobs_expand.sql 적용 후 실제 Job Sync E2E 테스트에서
-- "recommended_age_groups 컬럼을 찾을 수 없음(PGRST204)" 오류가 발생해 추가한다.
-- 0023은 이미 원격 DB에 적용되었으므로 수정하지 않고 새 migration으로 보완한다.

alter table public.jobs
  add column if not exists recommended_age_groups jsonb not null default '[]'::jsonb,
  add column if not exists requirements text,
  add column if not exists benefits text;

comment on column public.jobs.recommended_age_groups is
  '이 공고에 추천되는 연령대(AgeGroup) 배열. Work24 pfPreferential(B=(준)고령자 등)과 무관하게 관리자/Provider가 직접 지정할 수 있다.';

-- requirements/benefits는 STEP 1부터 Job 도메인 타입(src/types/job.ts)에 존재했지만
-- 실제 테이블에는 컬럼이 생성된 적이 없었다 (Repository는 항상 undefined로만 읽고 있었음).
comment on column public.jobs.requirements is '자격요건 원문(자유 서술). Work24 등 외부 Provider에는 없을 수 있다.';
comment on column public.jobs.benefits is '복리후생 원문(자유 서술).';

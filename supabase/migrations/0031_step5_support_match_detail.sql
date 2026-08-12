-- 0031_step5_support_match_detail.sql
-- STEP 5: match_results에 "충족/확인필요/부족" 조건 목록을 보관하는 범용 detail 컬럼을 추가한다.
-- 지원제도 매칭(target_type = 'support_program')에서 matchedConditions/missingConditions/
-- checkRequiredConditions를 저장하기 위해 필요하며, 향후 다른 target_type도 재사용할 수 있도록
-- 특정 도메인에 종속되지 않는 범용 jsonb로 설계한다. 기존 match_results 관련 migration(0012/0016/0018)은
-- 수정하지 않고 alter table로만 확장한다.

alter table public.match_results
  add column if not exists detail jsonb not null default '{}'::jsonb;

comment on column public.match_results.detail is
  '매칭 상세 정보 (예: { matchedConditions, missingConditions, checkRequiredConditions } - 지원제도 매칭에서 사용).';

-- 0032_step5_5_career_relevance.sql
-- STEP 5.5: 실 API("행정안전부_대한민국 공공서비스(혜택) 정보")에는 취업과 무관한 정부혜택도
-- 대량으로 섞여 있다(예: 유아학비, 장려금 등). 원본 데이터는 삭제하지 않고 보존하되,
-- "바로취업에 적합한 지원제도" 여부를 나타내는 점수/근거만 추가한다.
-- 기존 0001~0031 migration은 수정하지 않는다.

alter table public.support_programs
  add column if not exists career_relevance_score integer not null default 0,
  add column if not exists career_relevance_reasons jsonb not null default '[]'::jsonb;

comment on column public.support_programs.career_relevance_score is
  '제목/요약/지원대상/상세내용/선정기준을 종합해 계산한 "바로취업 관련도" 점수(0~100). '
  '외부 공공서비스 API에는 취업과 무관한 혜택도 다수 포함되어 있어, 사용자 노출 시 이 점수로 필터링한다. '
  '원본 데이터 자체는 삭제하지 않고 이 컬럼으로만 구분한다.';
comment on column public.support_programs.career_relevance_reasons is
  'career_relevance_score 산정에 사용된 근거(매칭된 키워드/필드) 목록. 관리자 화면에서 점수 산정 이유를 확인하기 위함.';

-- 목록/검색에서 "관련도 높은 순" 정렬 및 최소 점수 필터링에 사용.
create index if not exists idx_support_programs_career_relevance
  on public.support_programs (career_relevance_score desc);

-- 기존 데이터(Mock 등)는 일단 관련도 높음으로 간주해 두고, 이후 Sync가 실제 점수로 재계산한다.
update public.support_programs
  set career_relevance_score = 60,
      career_relevance_reasons = '["기존 데이터(마이그레이션 시점 기본값)"]'::jsonb
  where career_relevance_score = 0;

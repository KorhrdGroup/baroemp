-- 0016a_step3_5_deprecated_columns_nullable.sql
-- 실제 원격 Supabase 프로젝트에 0001~0020을 순서대로 적용하는 과정에서 발견한 버그 수정.
--
-- 0016_assessment_v2.sql은 assessment_questions.question_text / assessment_options.option_text를
-- 새로 추가하고 prompt/label을 "deprecated" 주석만 남겼을 뿐, 원래 NOT NULL 제약(0006_assessments.sql)은
-- 그대로 두었다. 그 결과 0017_assessment_v2_seed.sql처럼 question_text/option_text만 채우고
-- prompt/label을 채우지 않는 INSERT가 "null value in column \"prompt\" violates not-null constraint"
-- 오류로 실패했다 (실제 원격 DB에 적용해보고 나서야 드러난 문제 — Mock Mode/코드 리뷰만으로는 발견되지 않음).
--
-- 기존 migration 파일(0006/0016/0017)은 수정하지 않는다. 대신 0017이 의존하는 스키마 변경이므로
-- 파일명이 0016과 0017 사이에서 정렬되도록 "0016a"로 명명해 적용 순서를 맞춘다.

alter table public.assessment_questions
  alter column prompt drop not null;

alter table public.assessment_options
  alter column label drop not null;

comment on column public.assessment_questions.prompt is
  'deprecated: question_text 사용. NOT NULL 해제됨 (0016a) — 신규 행은 채우지 않아도 됨.';
comment on column public.assessment_options.label is
  'deprecated: option_text 사용. NOT NULL 해제됨 (0016a) — 신규 행은 채우지 않아도 됨.';

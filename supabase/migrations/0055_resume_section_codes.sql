-- 0055_resume_section_codes.sql
-- 이력서에 담을 항목을 이력서마다 정할 수 있게 한다.
--
-- 지금까지 어떤 항목을 보여줄지는 양식(resume_templates.sections)이 전부 정했다.
-- 그래서 "나는 학력은 빼고 싶다" 같은 조정을 할 방법이 없었고, 완성도도 양식
-- 기준으로만 계산돼 안 쓸 항목까지 못 채운 것으로 셌다.
--
-- 작성 시작 화면에서 고른 항목을 여기 저장하고, 비어 있으면 지금까지처럼
-- 양식의 항목을 그대로 쓴다. 기존 이력서는 전부 비어 있어 달라지지 않는다.
alter table public.resumes
  add column if not exists section_codes text[] not null default '{}'::text[];

comment on column public.resumes.section_codes is
  '이 이력서에 담을 항목 코드. 비어 있으면 양식(resume_templates.sections)을 따른다.';

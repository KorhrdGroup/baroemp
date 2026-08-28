-- 0052_resume_no_work_experience.sql
-- "경력 없음"을 밝힌 이력서를 표시한다.
--
-- 완성도는 경력이 1건 이상 있어야 그 항목을 채운 것으로 셌다. 그래서 경력이
-- 아예 없는 회원(신입·경력단절)은 진행 막대가 끝까지 차지 않고, 무엇을 더
-- 해야 하는지도 알 수 없었다. 빈 것과 없다고 밝힌 것은 다르므로 따로 담는다.

alter table public.resumes
  add column if not exists has_no_work_experience boolean not null default false;

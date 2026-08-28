-- 0051_resume_item_training_type.sql
-- 이력서 "기타" 항목에 교육 이수를 더한다.
--
-- 기존 다섯 종류(수상·프로젝트·대외활동·봉사활동·외국어)는 신입/사무직 이력서 기준이라
-- 중장년 재취업자가 실제로 쓸 직업훈련·자격 과정 이수를 넣을 칸이 없었다.
-- 값을 넓히기만 하므로 기존 데이터는 그대로다.

alter table public.resume_items
  drop constraint if exists resume_items_section_type_check;

alter table public.resume_items
  add constraint resume_items_section_type_check
  check (section_type = any (array['AWARD', 'PROJECT', 'ACTIVITY', 'VOLUNTEER', 'LANGUAGE', 'TRAINING']));

-- 0054_cover_letter_template_descriptions.sql
-- 자기소개서 양식 설명을 회원이 읽는 말로 바꾼다.
--
-- 이 설명은 원래 관리자 목록에서만 보였는데, 작성 시작 화면의 카드가
-- 그대로 읽어 쓰게 됐다. "지원동기/경력/강점/문제해결/포부 중심의 범용
-- 자기소개서 문항입니다" 는 항목을 나열한 말이라, 처음 고르는 사람이
-- 셋 중 무엇이 자기 얘기인지 가리기 어렵다.
--
-- 무엇이 담겼는지가 아니라 어떤 사람이 고르면 되는지를 적는다.
update public.cover_letter_templates
set description = '아직 어디에 낼지 안 정했다면. 지원 동기부터 입사 후 포부까지 두루 쓰는 문항이에요.'
where code = 'GENERAL';

update public.cover_letter_templates
set description = '지금까지 해오신 일이 새 일자리에서 어떻게 쓰일지 보여주는 문항이에요.'
where code = 'MIDLIFE';

update public.cover_letter_templates
set description = '요양·복지처럼 사람을 마주하는 일에 냅니다. 대하는 태도와 책임감을 묻는 문항이에요.'
where code = 'CARE_WELFARE';

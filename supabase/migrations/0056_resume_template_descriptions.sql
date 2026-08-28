-- 0056_resume_template_descriptions.sql
-- 이력서 양식 설명을 회원이 읽는 말로 바꾼다.
--
-- 자기소개서 양식과 같은 이유다(0054). 관리자 목록에서만 보이던 설명을 작성 시작
-- 화면의 카드가 그대로 읽어 쓰게 됐는데, "경력요약/담당업무/성과 중심으로 구성된
-- 경력직 전용 이력서입니다" 는 구성 요소를 늘어놓은 말이라 넷 중 무엇이 자기
-- 얘기인지 가리기 어렵다. 어떤 사람이 고르면 되는지를 적는다.
update public.resume_templates
set description = '어디에 낼지 아직 안 정했다면. 일하는 곳 대부분에서 통하는 기본 이력서예요.'
where code = 'STANDARD';

update public.resume_templates
set description = '한 분야에서 오래 일하셨다면. 맡았던 일과 해낸 일을 앞세워 보여줘요.'
where code = 'EXPERIENCED';

update public.resume_templates
set description = '오래 쉬었거나 하던 일을 바꾸신다면. 해오신 일을 새 일에 잇는 이력서예요.'
where code = 'MIDLIFE';

update public.resume_templates
set description = '요양·재가·복지관처럼 돌봄 일자리에 낸다면. 자격과 사람 대하는 일을 앞세워요.'
where code = 'CARE_WELFARE';

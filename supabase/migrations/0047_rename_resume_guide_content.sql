-- 0047_rename_resume_guide_content.sql
--
-- 0015_seed.sql이 만든 콘텐츠 "이력서 작성 가이드"는 실제로 읽을 가이드 문서가 있는 게 아니라
-- 이력서 작성 화면(/resume)으로 보내는 항목이다. 이름이 "가이드"라 문서를 기대하고 눌렀다가
-- 편집 화면이 열리면 무엇을 누른 건지 어긋난다. 하는 일 그대로 "이력서 작성하기"로 바꾼다.
--
-- 같은 시드가 summary/description 에 제목을 그대로 복사해 넣어 화면에서 제목이 두 번 보였다.
-- 설명도 실제 내용으로 채운다.

update public.contents
set
  title = '이력서 작성하기',
  summary = '경력·자격 정보를 불러와 이력서를 바로 작성합니다.',
  description = '저장해둔 경력과 자격 정보를 불러와 이력서를 작성하고, AI 첨삭으로 문장을 다듬을 수 있습니다.'
where slug = 'content-9';

-- 0065_contents_external_url.sql
-- 자격 취득 과정 같은 콘텐츠에 "준비하러 가기"로 보낼 외부 신청/안내 페이지 주소를 담는다.
-- 콘텐츠 상세 화면이 없어 지금은 카드가 /support·/resume 로만 떨어지는데,
-- 주소가 있으면 실제 과정 페이지로 바로 보낼 수 있다. 값은 관리자 콘텐츠 편집에서 넣는다.

alter table public.contents add column if not exists external_url text;

comment on column public.contents.external_url is '외부 신청/안내 페이지 URL. 있으면 추천 카드가 이 주소로 새 탭 연결된다.';

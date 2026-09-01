-- 공고 키워드 검색을 인덱스로 태운다.
--
-- 키워드 검색은 title/company_name/description 세 칸에 ILIKE '%말%' 를 건다.
-- 앞뒤가 열린 패턴이라 일반 B-tree 는 쓰이지 못해, 6.5만 건을 매번 통째로 훑었다
-- ("운전" 기준 1.7초/회). 결과 화면처럼 한 장에서 여러 번 세는 곳은 이것만으로 15초가 걸렸다.
--
-- pg_trgm 은 세 글자 조각을 만들어 찾으므로 "운전"·"배송"처럼 두 글자인 한글 검색어에는
-- 아예 쓰이지 못한다. 우리 직업 이름은 두 글자가 흔해 그 경우가 곧 가장 느린 경우였다.
-- PGroonga 는 한글을 글자 단위로 색인해 두 글자도 인덱스를 탄다("운전" 1.7초 -> 0.2초).
--
-- 읽기 전용 최적화라 데이터·스키마는 그대로다. 되돌리려면 인덱스만 지우면 된다.
create extension if not exists pgroonga;

create index if not exists jobs_title_pgroonga_idx on jobs using pgroonga (title);
create index if not exists jobs_company_name_pgroonga_idx on jobs using pgroonga (company_name);
create index if not exists jobs_description_pgroonga_idx on jobs using pgroonga (description);

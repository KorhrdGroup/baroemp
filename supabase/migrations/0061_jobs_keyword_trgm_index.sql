-- 공고 키워드 검색을 인덱스로 태운다.
--
-- 키워드 검색은 title/company_name/description 세 칸에 ILIKE '%말%' 를 건다.
-- 앞뒤가 열린 패턴이라 일반 B-tree 는 쓰이지 못해, 6.5만 건을 매번 통째로 훑었다
-- ("운전" 기준 850ms/회). 결과 화면처럼 한 장에서 여러 번 세는 곳은 이것만으로 6초가 넘었다.
--
-- pg_trgm 의 GIN 인덱스는 세 글자 조각으로 후보를 좁혀 ILIKE 를 그대로 쓰면서도 인덱스를 탄다.
-- 읽기 전용 최적화라 데이터·스키마는 그대로다. 되돌리려면 인덱스만 지우면 된다.
create extension if not exists pg_trgm;

create index if not exists jobs_title_trgm_idx on jobs using gin (title gin_trgm_ops);
create index if not exists jobs_company_name_trgm_idx on jobs using gin (company_name gin_trgm_ops);
create index if not exists jobs_description_trgm_idx on jobs using gin (description gin_trgm_ops);

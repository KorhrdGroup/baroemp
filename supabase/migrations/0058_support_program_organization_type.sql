-- 0058_support_program_organization_type.sql
--
-- 원본(공공서비스 OPEN API)의 "소관기관유형" 을 그대로 담는다.
-- 실측값은 중앙행정기관 / 광역시도 / 시군구 / 교육청 / 공공기관 다섯 가지다.
--
-- 지금까지는 파서가 이 값을 쓰고 버려서, "중앙행정기관이면 전국" 하나만 판단하고
-- 나머지는 기관명에서 지역 이름을 찾는 데 의존했다. 그래서 한국장학재단·대한법률구조공단처럼
-- 이름에 지역이 없는 전국 기관 1,000여 건이 지역 미상으로 남았고, 매칭에서 통째로 빠졌다.
--
-- 값을 담아두면 "이름에 지역이 없다"와 "전국이다"를 구분할 수 있다.

alter table public.support_programs
  add column if not exists organization_type text;

comment on column public.support_programs.organization_type is
  '원본 소관기관유형. 중앙행정기관 / 광역시도 / 시군구 / 교육청 / 공공기관.';

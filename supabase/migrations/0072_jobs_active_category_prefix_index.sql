-- 0072: 직종 코드 앞자리 검색용 인덱스.
--
-- 직종 필터는 job_category like '4231%' 처럼 앞자리로 찾는다. 0014 의 (job_category, region)
-- 인덱스는 DB 정렬 규칙(en_US.UTF-8) 때문에 like 앞자리 비교에 쓰이지 못해, 매번 표 전체를 훑었다.
-- 회원으로 /jobs 를 열면 진단 추천·큐레이션이 이 조건으로 여러 번 조회해, 정확한 건수까지 세는
-- 조회가 8초 제한에 걸려 페이지가 열리지 않았다.
--
-- text_pattern_ops 로 만들면 like 앞자리 비교에 인덱스를 쓸 수 있다.
-- 조회 조건(is_active = true and status = 'published')과 같은 부분 인덱스로 둔다 (0071 과 같은 이유).

create index if not exists idx_jobs_active_category_pattern
  on public.jobs (job_category text_pattern_ops)
  where is_active = true and status = 'published';

analyze public.jobs;

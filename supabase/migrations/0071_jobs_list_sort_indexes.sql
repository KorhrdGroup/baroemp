-- 0071: 일자리찾기 목록 정렬용 인덱스.
--
-- /jobs 첫 화면(비로그인·추천순)과 큐레이션 신규 탭은 활성 공고 전체를 정렬한 뒤 앞쪽만 잘랐다.
-- 정렬 순서에 맞는 인덱스가 없어(posted_at 인덱스는 NULLS FIRST 라 "빈 값을 뒤로" 정렬에 못 쓴다)
-- 매번 표 전체를 훑어 각 조회가 2.5~3초, 정확한 건수까지 세면 5.5초가 걸렸다.
--
-- 조회 조건(is_active = true and status = 'published')과 같은 부분 인덱스로 두어,
-- 정렬은 인덱스 순서대로 앞 20건/200건만 읽고, 건수는 이 인덱스만 세면 끝나게 한다.
-- 정렬 키는 job.supabase-repository.ts search() 의 order() 와 똑같아야 인덱스를 탄다.

-- 추천순 (search() 기본 정렬)
create index if not exists idx_jobs_active_recommended
  on public.jobs (midlife_recommendation_score desc nulls last, created_at desc)
  where is_active = true and status = 'published';

-- 최신순 (정렬 "latest", 큐레이션 신규 탭)
create index if not exists idx_jobs_active_latest
  on public.jobs (posted_at desc nulls last, created_at desc)
  where is_active = true and status = 'published';

-- 마감 공고 14만 건을 비활성화한 뒤라 플래너 통계를 새로 잡는다.
analyze public.jobs;

-- 0050_job_detail_sync.sql
-- 고용24 상세 조회(callTp=D) 동기화 상태를 기록한다.
--
-- 목록 API(callTp=L)만 부르고 있어 description 이 제목 복사본(평균 21자)이었고,
-- requirements/qualification_requirements 는 전건 null 이었다. 그래서 요건 추출기가
-- 볼 원문이 없었다. 상세는 공고 한 건씩 따로 불러야 해서, 어디까지 받았는지
-- 표시해 두어야 이어받기와 재시도가 가능하다.

alter table public.jobs
  add column if not exists detail_fetched_at timestamptz;

-- 아직 상세를 못 받은 살아있는 공고를 고르는 경로. 받은 건은 인덱스에 넣지 않는다.
create index if not exists idx_jobs_detail_pending
  on public.jobs (posted_at desc)
  where detail_fetched_at is null and is_active;

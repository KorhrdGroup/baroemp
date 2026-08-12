-- 0025_step4_job_rls_indexes.sql
-- STEP 4: jobs 검색 성능 Index 추가 + jobs 공개 조회 RLS를 is_active까지 반영하도록 보정.
-- 기존 0013_rls.sql / 0014_indexes.sql은 수정하지 않고, 정책을 drop 후 재생성한다.

-- 대규모 채용공고를 고려한 검색 Index. 무조건 전체 jobs를 가져와 client filter 하지 않고
-- Job Search Service가 이 컬럼들을 조건으로 서버사이드 페이지네이션 쿼리를 던진다는 전제로 설계했다.
create index if not exists idx_jobs_is_active on public.jobs (is_active) where is_active = true;
create index if not exists idx_jobs_region_sigungu on public.jobs (region, region_sigungu);
create index if not exists idx_jobs_occupation_code on public.jobs (occupation_code);
create index if not exists idx_jobs_apply_deadline on public.jobs (apply_deadline);
create index if not exists idx_jobs_posted_at on public.jobs (posted_at desc);
create index if not exists idx_jobs_salary_range on public.jobs (salary_min, salary_max);
create index if not exists idx_jobs_external_fetched on public.jobs (external_source, fetched_at);

create index if not exists idx_job_bookmarks_user on public.job_bookmarks (user_id, created_at desc);
create index if not exists idx_job_bookmarks_job on public.job_bookmarks (job_id);

-- jobs_public_read는 STEP 2에서 status만 검사했다. STEP 4부터는 is_active=false(마감/Provider 소거)된
-- 공고를 비회원/일반회원에게 계속 노출하면 안 되므로 조건을 함께 검사하도록 재생성한다.
drop policy if exists jobs_public_read on public.jobs;
create policy jobs_public_read on public.jobs
  for select using ((status = 'published' and is_active = true) or public.is_staff(auth.uid()));

-- job_sync_runs / job_bookmarks 정책은 0024/0013에서 이미 정의되어 있으므로 변경하지 않는다.

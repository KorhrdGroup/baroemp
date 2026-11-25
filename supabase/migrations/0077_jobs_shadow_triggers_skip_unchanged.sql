-- 0077: 검색용 보조 표 트리거가 "값이 실제로 바뀐 줄"만 따라 쓰게 한다.
--
-- 0073·0075·0076 의 트리거는 `after update of <칼럼>` 이라 그 칼럼이 UPDATE 대상에만 들어 있으면
-- 값이 같아도 실행된다. 공고 동기화는 upsert 로 모든 칼럼을 덮어쓰므로, 동기화한 공고마다
-- jobs_search 한 줄과 jobs_keyword 한 줄(PGroonga 인덱스 3개 포함)을 다시 썼다.
-- 그 결과 매일 새벽 동기화가 디스크 I/O 예산을 크게 소모했다 (2026-11-25 Supabase 경고).
--
-- INSERT 는 OLD 를 볼 수 없어 따로 두고, UPDATE 는 WHEN 조건으로 바뀐 줄만 함수까지 가게 한다.
-- 동기화 함수(sync_jobs_search, sync_jobs_keyword)와 보조 표 내용은 바꾸지 않는다.
-- 여러 번 실행해도 안전하다.

drop trigger if exists trg_jobs_search_sync on public.jobs;
drop trigger if exists trg_jobs_search_sync_ins on public.jobs;
drop trigger if exists trg_jobs_search_sync_upd on public.jobs;

create trigger trg_jobs_search_sync_ins
  after insert on public.jobs
  for each row execute function public.sync_jobs_search();

create trigger trg_jobs_search_sync_upd
  after update of
    is_active, status, job_category, region, region_sigungu, work_type, is_beginner_friendly,
    salary_min, salary_max, apply_deadline, preferential_codes, tags, preferred_qualifications,
    midlife_recommendation_score, created_at, posted_at
  on public.jobs
  for each row
  when (
    (old.is_active, old.status, old.job_category, old.region, old.region_sigungu, old.work_type,
     old.is_beginner_friendly, old.salary_min, old.salary_max, old.apply_deadline,
     old.preferential_codes, old.tags, old.preferred_qualifications,
     old.midlife_recommendation_score, old.created_at, old.posted_at)
    is distinct from
    (new.is_active, new.status, new.job_category, new.region, new.region_sigungu, new.work_type,
     new.is_beginner_friendly, new.salary_min, new.salary_max, new.apply_deadline,
     new.preferential_codes, new.tags, new.preferred_qualifications,
     new.midlife_recommendation_score, new.created_at, new.posted_at)
  )
  execute function public.sync_jobs_search();

drop trigger if exists trg_jobs_keyword_sync on public.jobs;
drop trigger if exists trg_jobs_keyword_sync_ins on public.jobs;
drop trigger if exists trg_jobs_keyword_sync_upd on public.jobs;

create trigger trg_jobs_keyword_sync_ins
  after insert on public.jobs
  for each row execute function public.sync_jobs_keyword();

create trigger trg_jobs_keyword_sync_upd
  after update of title, company_name, description on public.jobs
  for each row
  when (
    (old.title, old.company_name, old.description)
    is distinct from
    (new.title, new.company_name, new.description)
  )
  execute function public.sync_jobs_keyword();

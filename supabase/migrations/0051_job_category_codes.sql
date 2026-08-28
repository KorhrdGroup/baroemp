-- 0051_job_category_codes.sql
-- 워크넷 직종코드 ↔ 직종명 참조 표.
--
-- 채용공고 목록 API는 직종코드(jobsCd)만 내려주고 이름을 주지 않는다. 그래서 관리자 통계에
-- 624102 같은 숫자가 그대로 노출됐다. 상세 API에서 한 번 받아온 이름을 여기에 쌓아두고 재사용한다.
-- 갱신은 scripts/sync-job-category-names.ts 가 담당한다.

create table if not exists public.job_category_codes (
  code text primary key,
  name text not null,
  updated_at timestamptz not null default now()
);

alter table public.job_category_codes enable row level security;

-- 직종명은 공개 정보라 조회는 열어둔다 (쓰기는 service role 전용).
drop policy if exists "job_category_codes_read" on public.job_category_codes;
create policy "job_category_codes_read" on public.job_category_codes for select using (true);

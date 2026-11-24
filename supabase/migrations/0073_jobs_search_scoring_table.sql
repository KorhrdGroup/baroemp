-- 0073: 추천순 검색(search_jobs_scored)을 좁은 표에서 계산한다.
--
-- 실행 계획을 보니 4초 중 3.4초가 활성 공고 11만 건을 디스크에서 읽는 시간이었다
-- (47,646 페이지, 약 370MB). 점수 계산·정렬은 0.4초뿐이었다. 공고 한 줄에 본문·원본 데이터가
-- 함께 실려 한 페이지에 두세 건밖에 안 들어가는데, 점수에는 작은 칼럼 열다섯 개만 쓴다.
--
-- 그 칼럼만 담은 jobs_search 를 두고 jobs 가 바뀔 때 트리거로 따라 바꾼다. 공고 동기화 코드는
-- 그대로다. 지울 때는 외래 키(on delete cascade)가 같이 지운다.
-- 함수는 좁은 표로 점수를 매기고, 잘라낸 20건에만 원래 표의 본문을 붙인다 (돌려주는 모양은 0070 과 같다).
--
-- 되돌리려면 0070 의 함수를 다시 만들고 트리거·표를 지우면 된다.

create table if not exists public.jobs_search (
  id uuid primary key references public.jobs (id) on delete cascade,
  is_active boolean not null,
  status text not null,
  job_category text not null,
  region text,
  region_sigungu text,
  work_type text,
  is_beginner_friendly boolean not null,
  salary_min numeric,
  salary_max numeric,
  apply_deadline timestamptz,
  preferential_codes jsonb,
  tags jsonb,
  preferred_qualifications jsonb,
  midlife_recommendation_score numeric(3,1),
  created_at timestamptz not null
);

-- 서버(service role)만 쓰는 내부 표다. 공개 API 로 읽히지 않게 정책 없이 RLS 만 켠다.
alter table public.jobs_search enable row level security;

create or replace function public.sync_jobs_search()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.jobs_search (
    id,
    is_active,
    status,
    job_category,
    region,
    region_sigungu,
    work_type,
    is_beginner_friendly,
    salary_min,
    salary_max,
    apply_deadline,
    preferential_codes,
    tags,
    preferred_qualifications,
    midlife_recommendation_score,
    created_at
  ) values (
    new.id,
    new.is_active,
    new.status,
    new.job_category,
    new.region,
    new.region_sigungu,
    new.work_type,
    new.is_beginner_friendly,
    new.salary_min,
    new.salary_max,
    new.apply_deadline,
    new.preferential_codes,
    new.tags,
    new.preferred_qualifications,
    new.midlife_recommendation_score,
    new.created_at
  )
  on conflict (id) do update set
    is_active = excluded.is_active,
    status = excluded.status,
    job_category = excluded.job_category,
    region = excluded.region,
    region_sigungu = excluded.region_sigungu,
    work_type = excluded.work_type,
    is_beginner_friendly = excluded.is_beginner_friendly,
    salary_min = excluded.salary_min,
    salary_max = excluded.salary_max,
    apply_deadline = excluded.apply_deadline,
    preferential_codes = excluded.preferential_codes,
    tags = excluded.tags,
    preferred_qualifications = excluded.preferred_qualifications,
    midlife_recommendation_score = excluded.midlife_recommendation_score,
    created_at = excluded.created_at;
  return null;
end;
$$;

-- 점수에 쓰는 칼럼이 바뀔 때만 따라간다. 동기화가 본문·updated_at 만 고칠 때는 건너뛴다.
drop trigger if exists trg_jobs_search_sync on public.jobs;
create trigger trg_jobs_search_sync
  after insert or update of
    is_active, status, job_category, region, region_sigungu, work_type, is_beginner_friendly,
    salary_min, salary_max, apply_deadline, preferential_codes, tags, preferred_qualifications,
    midlife_recommendation_score, created_at
  on public.jobs
  for each row execute function public.sync_jobs_search();

-- 지금 있는 공고를 채운다. 트리거를 먼저 걸어 두어, 채우는 사이에 바뀐 줄도 빠지지 않는다.
insert into public.jobs_search (
  id,
    is_active,
    status,
    job_category,
    region,
    region_sigungu,
    work_type,
    is_beginner_friendly,
    salary_min,
    salary_max,
    apply_deadline,
    preferential_codes,
    tags,
    preferred_qualifications,
    midlife_recommendation_score,
    created_at
)
select
  id,
  is_active,
  status,
  job_category,
  region,
  region_sigungu,
  work_type,
  is_beginner_friendly,
  salary_min,
  salary_max,
  apply_deadline,
  preferential_codes,
  tags,
  preferred_qualifications,
  midlife_recommendation_score,
  created_at
from public.jobs
on conflict (id) do update set
  is_active = excluded.is_active,
    status = excluded.status,
    job_category = excluded.job_category,
    region = excluded.region,
    region_sigungu = excluded.region_sigungu,
    work_type = excluded.work_type,
    is_beginner_friendly = excluded.is_beginner_friendly,
    salary_min = excluded.salary_min,
    salary_max = excluded.salary_max,
    apply_deadline = excluded.apply_deadline,
    preferential_codes = excluded.preferential_codes,
    tags = excluded.tags,
    preferred_qualifications = excluded.preferred_qualifications,
    midlife_recommendation_score = excluded.midlife_recommendation_score,
    created_at = excluded.created_at;

analyze public.jobs_search;

create or replace function public.search_jobs_scored(
  p_profile jsonb,
  p_filter jsonb default '{}'::jsonb,
  p_limit int default 20,
  p_offset int default 0
)
returns table (job jsonb, match_score int, total_count bigint)
language sql
stable
as $$
  with prof as (
    select
      coalesce((select array_agg(x || '%') from jsonb_array_elements_text(coalesce(p_profile->'desired_prefixes', '[]'::jsonb)) x), '{}'::text[]) as prefix_patterns,
      p_profile->>'region' as region,
      (p_profile->>'salary_min')::numeric as salary_min,
      (p_profile->>'salary_max')::numeric as salary_max,
      coalesce(p_profile->'work_types', '[]'::jsonb) as work_types,
      coalesce((p_profile->>'career_open')::boolean, false) as career_open,
      coalesce((p_profile->>'can_drive')::boolean, false) as can_drive,
      coalesce(p_profile->'interest_tags', '[]'::jsonb) as interest_tags,
      jsonb_array_length(coalesce(p_profile->'interest_tags', '[]'::jsonb)) > 0 as has_interest_tags,
      coalesce((p_profile->>'midlife_age')::boolean, false) as midlife_age,
      coalesce(p_profile->'held_qualifications', '[]'::jsonb) as held_quals
  ),
  flt as (
    select
      coalesce((p_filter->>'active_only')::boolean, true) as active_only,
      p_filter->>'region' as region,
      coalesce(p_filter->'sigungus', '[]'::jsonb) as sigungus,
      coalesce((select array_agg(x || '%') from jsonb_array_elements_text(coalesce(p_filter->'category_prefixes', '[]'::jsonb)) x), '{}'::text[]) as category_patterns,
      coalesce((p_filter->>'beginner_only')::boolean, false) as beginner_only,
      (p_filter->>'closing_within_days')::int as closing_within_days,
      nullif(trim(p_filter->>'keyword'), '') as keyword
  ),
  scored as (
    select
      f.id,
      f.midlife_recommendation_score,
      f.created_at,
      (
        case when f.job_category like any (prof.prefix_patterns) then 30 else 0 end
        + case when prof.region is not null and f.region = prof.region then 20 else 0 end
        + case when (prof.salary_min is not null or prof.salary_max is not null)
                    and coalesce(f.salary_max, f.salary_min, 1e12) >= coalesce(prof.salary_min, 0)
                    and coalesce(f.salary_min, 0) <= coalesce(prof.salary_max, 1e12)
               then 15 else 0 end
        + case when prof.work_types ? f.work_type then 10 else 0 end
        + case when f.is_beginner_friendly and prof.career_open then 15 else 0 end
        + case when not prof.can_drive then 0
               when coalesce(f.preferential_codes, '[]'::jsonb) ? '14' then 10
               when exists (select 1 from jsonb_array_elements_text(coalesce(f.tags, '[]'::jsonb)) t where t like '%운전%') then 10
               else 0 end
        + case when not prof.has_interest_tags then 0
               else least(16, 8 * (select count(*) from jsonb_array_elements_text(coalesce(f.tags, '[]'::jsonb)) t where prof.interest_tags ? t)) end
        + case when prof.midlife_age and coalesce(f.preferential_codes, '[]'::jsonb) ? 'B' then 8 else 0 end
        + case when f.preferred_qualifications is null or jsonb_array_length(f.preferred_qualifications) = 0 then 0
               when prof.held_quals @> f.preferred_qualifications then 12 else 0 end
      )::int as match_score
    from public.jobs_search f, prof, flt
    where (not flt.active_only or (f.is_active and f.status = 'published'))
      and (flt.region is null or f.region = flt.region)
      and (jsonb_array_length(flt.sigungus) = 0 or flt.sigungus ? coalesce(f.region_sigungu, ''))
      and (cardinality(flt.category_patterns) = 0 or f.job_category like any (flt.category_patterns))
      and (not flt.beginner_only or f.is_beginner_friendly)
      and (flt.closing_within_days is null
           or (f.apply_deadline is not null
               and f.apply_deadline >= now()
               and f.apply_deadline <= now() + make_interval(days => flt.closing_within_days)))
      -- 키워드는 본문까지 봐야 해서 좁은 표에 없다. 원래 표에서 찾는다 (0061 의 PGroonga 인덱스).
      and (flt.keyword is null
           or f.id in (select k.id from public.jobs k
                       where k.title ilike '%' || flt.keyword || '%'
                          or k.company_name ilike '%' || flt.keyword || '%'
                          or k.description ilike '%' || flt.keyword || '%'))
  ),
  page as (
    select s.id, s.match_score, count(*) over () as total_count
    from scored s
    order by s.match_score desc, s.midlife_recommendation_score desc nulls last, s.created_at desc
    limit greatest(p_limit, 1) offset greatest(p_offset, 0)
  )
  select to_jsonb(j) - 'raw_payload' as job, page.match_score, page.total_count
  from page
  join public.jobs j on j.id = page.id
  order by page.match_score desc, j.midlife_recommendation_score desc nulls last, j.created_at desc;
$$;

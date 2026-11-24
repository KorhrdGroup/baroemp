-- 0076: 로그인 안 한 /jobs 키워드 검색(과 추천순이 아닌 정렬의 키워드 검색)을 좁은 표에서 한다.
--
-- 이 검색은 앱이 jobs 표에 바로 조회를 보낸다(ilike + 정확한 건수). 0075 뒤에도 "요양" 3.5초였다.
-- 20건 한 페이지는 0.04~0.5초인데, "총 N건"을 세려고 맞는 공고 2.9만 건을 큰 jobs 표에서 읽었다.
-- 추천순 검색(search_jobs_scored)처럼 jobs_search·jobs_keyword 두 좁은 표에서 거르고 세고 정렬하고,
-- 잘라낸 20건에만 원래 표의 내용을 붙이는 함수 search_jobs_keyword 를 둔다.
--
-- 최신순 정렬에 쓰는 posted_at 이 jobs_search 에 없어 칼럼을 더하고 트리거가 따라 쓰게 한다.
-- 되돌리려면 함수를 지우고(앱은 키워드가 있어도 예전 조회로 돌아가야 하니 코드도 함께) 0073 의 트리거
-- 함수를 다시 만들면 된다. 더한 칼럼은 남아 있어도 해가 없다.

alter table public.jobs_search add column if not exists posted_at timestamptz;

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
    created_at,
    posted_at
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
    new.created_at,
    new.posted_at
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
    created_at = excluded.created_at,
    posted_at = excluded.posted_at;
  return null;
end;
$$;

drop trigger if exists trg_jobs_search_sync on public.jobs;
create trigger trg_jobs_search_sync
  after insert or update of
    is_active, status, job_category, region, region_sigungu, work_type, is_beginner_friendly,
    salary_min, salary_max, apply_deadline, preferential_codes, tags, preferred_qualifications,
    midlife_recommendation_score, created_at, posted_at
  on public.jobs
  for each row execute function public.sync_jobs_search();

-- 트리거를 먼저 바꾼 뒤 채운다. 채우는 사이 바뀐 공고는 트리거가 이미 맞게 써 두었다.
update public.jobs_search f
set posted_at = j.posted_at
from public.jobs j
where j.id = f.id and f.posted_at is distinct from j.posted_at;

analyze public.jobs_search;

-- p_filter 는 search_jobs_scored 와 같은 모양이다. p_sort 는 앱의 JobSortOrder 값이고,
-- 모르는 값이면 추천순(공고 자체의 중장년 추천도)으로 본다. 앱의 정렬과 같은 순서를 쓴다.
create or replace function public.search_jobs_keyword(
  p_filter jsonb,
  p_sort text default 'recommended',
  p_limit int default 20,
  p_offset int default 0
)
returns table (job jsonb, total_count bigint)
language plpgsql
stable
set search_path = public, extensions
as $fn$
declare
  v_keyword text := nullif(trim(p_filter->>'keyword'), '');
  v_keyword_clause text := '';
  v_order_f text;
  v_order_j text;
begin
  if v_keyword is not null then
    -- 0075 와 같다. 좁은 키워드 표에서 &@ 로 찾고, offset 0 울타리로 먼저 끝낸다.
    v_keyword_clause := format(
      'and f.id in (select k.id from public.jobs_keyword k where k.title &@ %1$L or k.company_name &@ %1$L or k.description &@ %1$L offset 0)',
      v_keyword
    );
  end if;

  -- 정렬은 정해진 글자에서만 고른다(받은 값을 쿼리에 그대로 넣지 않는다).
  case p_sort
    when 'deadline' then v_order_f := 'f.apply_deadline asc nulls last';
    when 'salary_desc' then v_order_f := 'f.salary_max desc nulls last';
    when 'latest' then v_order_f := 'f.posted_at desc nulls last, f.created_at desc';
    else v_order_f := 'f.midlife_recommendation_score desc nulls last, f.created_at desc';
  end case;
  v_order_j := replace(v_order_f, 'f.', 'page.');

  return query execute format($q$
  with flt as (
    select
      coalesce(($1->>'active_only')::boolean, true) as active_only,
      $1->>'region' as region,
      coalesce($1->'sigungus', '[]'::jsonb) as sigungus,
      coalesce((select array_agg(x || '%%') from jsonb_array_elements_text(coalesce($1->'category_prefixes', '[]'::jsonb)) x), '{}'::text[]) as category_patterns,
      coalesce(($1->>'beginner_only')::boolean, false) as beginner_only,
      ($1->>'closing_within_days')::int as closing_within_days
  ),
  page as (
    select f.id, f.apply_deadline, f.salary_max, f.posted_at, f.midlife_recommendation_score, f.created_at,
           count(*) over () as total_count
    from public.jobs_search f, flt
    where (not flt.active_only or (f.is_active and f.status = 'published'))
      and (flt.region is null or f.region = flt.region)
      and (jsonb_array_length(flt.sigungus) = 0 or flt.sigungus ? coalesce(f.region_sigungu, ''))
      and (cardinality(flt.category_patterns) = 0 or f.job_category like any (flt.category_patterns))
      and (not flt.beginner_only or f.is_beginner_friendly)
      and (flt.closing_within_days is null
           or (f.apply_deadline is not null
               and f.apply_deadline >= now()
               and f.apply_deadline <= now() + make_interval(days => flt.closing_within_days)))
      %s
    order by %s
    limit greatest($2, 1) offset greatest($3, 0)
  )
  select to_jsonb(j) - 'raw_payload' as job, page.total_count
  from page
  join public.jobs j on j.id = page.id
  order by %s;
  $q$, v_keyword_clause, v_order_f, v_order_j)
  using p_filter, p_limit, p_offset;
end;
$fn$;

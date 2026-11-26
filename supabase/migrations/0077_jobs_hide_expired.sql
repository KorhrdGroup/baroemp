-- 0077: 마감일이 지난 공고를 일자리 검색에서 뺀다.
--
-- 공고 동기화는 외부(고용24)에서 더 이상 내려오지 않는 공고만 비활성으로 바꾼다(deactivateStale).
-- 마감일이 지났어도 외부에 아직 걸려 있는 공고는 is_active = true 로 남아, /jobs 목록에 "마감" 카드로 나왔다.
-- 두 검색 함수(추천순 search_jobs_scored · 그 밖의 정렬/비로그인 키워드 search_jobs_keyword)의
-- "활성 공고만" 조건에 마감일 조건 하나만 더한다. 나머지는 0075 · 0076 정의와 똑같다.
-- 데이터는 바꾸지 않는다(is_active 는 그대로). 되돌리려면 0075 · 0076 의 두 함수 정의를 다시 실행하면 된다.

create or replace function public.search_jobs_scored(
  p_profile jsonb,
  p_filter jsonb default '{}'::jsonb,
  p_limit int default 20,
  p_offset int default 0
)
returns table (job jsonb, match_score int, total_count bigint)
language plpgsql
stable
-- &@ 는 PGroonga 확장이 만든 연산자다. 확장이 extensions 쪽에 있어도 찾도록 경로를 정해 둔다.
set search_path = public, extensions
as $fn$
declare
  v_keyword text := nullif(trim(p_filter->>'keyword'), '');
  v_keyword_clause text := '';
begin
  if v_keyword is not null then
    -- 키워드는 좁은 키워드 표(jobs_keyword)에서 PGroonga 전용 &@ 로 찾는다.
    -- offset 0 은 이 하위 조회를 먼저 따로 끝내게 하는 울타리다(0074 참고).
    -- 활성 공고 여부는 바깥의 jobs_search 조건이 거른다.
    v_keyword_clause := format(
      'and f.id in (select k.id from public.jobs_keyword k where k.title &@ %1$L or k.company_name &@ %1$L or k.description &@ %1$L offset 0)',
      v_keyword
    );
  end if;

  return query execute format($q$
  with prof as (
    select
      coalesce((select array_agg(x || '%%') from jsonb_array_elements_text(coalesce($1->'desired_prefixes', '[]'::jsonb)) x), '{}'::text[]) as prefix_patterns,
      $1->>'region' as region,
      ($1->>'salary_min')::numeric as salary_min,
      ($1->>'salary_max')::numeric as salary_max,
      coalesce($1->'work_types', '[]'::jsonb) as work_types,
      coalesce(($1->>'career_open')::boolean, false) as career_open,
      coalesce(($1->>'can_drive')::boolean, false) as can_drive,
      coalesce($1->'interest_tags', '[]'::jsonb) as interest_tags,
      jsonb_array_length(coalesce($1->'interest_tags', '[]'::jsonb)) > 0 as has_interest_tags,
      coalesce(($1->>'midlife_age')::boolean, false) as midlife_age,
      coalesce($1->'held_qualifications', '[]'::jsonb) as held_quals
  ),
  flt as (
    select
      coalesce(($2->>'active_only')::boolean, true) as active_only,
      $2->>'region' as region,
      coalesce($2->'sigungus', '[]'::jsonb) as sigungus,
      coalesce((select array_agg(x || '%%') from jsonb_array_elements_text(coalesce($2->'category_prefixes', '[]'::jsonb)) x), '{}'::text[]) as category_patterns,
      coalesce(($2->>'beginner_only')::boolean, false) as beginner_only,
      ($2->>'closing_within_days')::int as closing_within_days,
      nullif(trim($2->>'keyword'), '') as keyword
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
               when exists (select 1 from jsonb_array_elements_text(coalesce(f.tags, '[]'::jsonb)) t where t like '%%운전%%') then 10
               else 0 end
        + case when not prof.has_interest_tags then 0
               else least(16, 8 * (select count(*) from jsonb_array_elements_text(coalesce(f.tags, '[]'::jsonb)) t where prof.interest_tags ? t)) end
        + case when prof.midlife_age and coalesce(f.preferential_codes, '[]'::jsonb) ? 'B' then 8 else 0 end
        + case when f.preferred_qualifications is null or jsonb_array_length(f.preferred_qualifications) = 0 then 0
               when prof.held_quals @> f.preferred_qualifications then 12 else 0 end
      )::int as match_score
    from public.jobs_search f, prof, flt
    where (not flt.active_only or (f.is_active and f.status = 'published'))
      -- 0077: 마감일이 지난 공고는 활성이어도 뺀다. 마감일은 날짜만 와서 UTC 자정으로 들어 있으니
      -- 한국 날짜로 오늘 0시와 견준다(마감일 당일은 하루 종일 보인다). 마감일이 없으면 상시채용이라 둔다.
      and (not flt.active_only
           or f.apply_deadline is null
           or f.apply_deadline >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'))
      and (flt.region is null or f.region = flt.region)
      and (jsonb_array_length(flt.sigungus) = 0 or flt.sigungus ? coalesce(f.region_sigungu, ''))
      and (cardinality(flt.category_patterns) = 0 or f.job_category like any (flt.category_patterns))
      and (not flt.beginner_only or f.is_beginner_friendly)
      and (flt.closing_within_days is null
           or (f.apply_deadline is not null
               and f.apply_deadline >= now()
               and f.apply_deadline <= now() + make_interval(days => flt.closing_within_days)))
      %s
  ),
  page as (
    select s.id, s.match_score, count(*) over () as total_count
    from scored s
    order by s.match_score desc, s.midlife_recommendation_score desc nulls last, s.created_at desc
    limit greatest($3, 1) offset greatest($4, 0)
  )
  select to_jsonb(j) - 'raw_payload' as job, page.match_score, page.total_count
  from page
  join public.jobs j on j.id = page.id
  order by page.match_score desc, j.midlife_recommendation_score desc nulls last, j.created_at desc;
  $q$, v_keyword_clause)
  using p_profile, p_filter, p_limit, p_offset;
end;
$fn$;

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
      -- 0077: 마감일이 지난 공고는 활성이어도 뺀다. 마감일은 날짜만 와서 UTC 자정으로 들어 있으니
      -- 한국 날짜로 오늘 0시와 견준다(마감일 당일은 하루 종일 보인다). 마감일이 없으면 상시채용이라 둔다.
      and (not flt.active_only
           or f.apply_deadline is null
           or f.apply_deadline >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'))
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

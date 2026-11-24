-- 0074: 추천순 검색의 키워드 조건이 인덱스를 타게 한다.
--
-- 0073 뒤 키워드 없는 추천순 검색은 0.1~0.7초가 됐지만, 키워드가 있으면 오히려 느려졌다
-- ("요양" 8초 초과로 실패, "운전" 2.8초). 키워드가 함수 안의 값이라 실행 계획을 세울 때 모르는
-- 값이 되어, 0061 의 PGroonga 인덱스를 쓰지 못하고 공고 25만 건의 본문을 전부 훑었다.
-- 같은 조건을 앱에서 바로 보내면(값이 그대로 박힌 쿼리) 인덱스를 타 0.15~0.2초였다.
--
-- 그래서 키워드가 있을 때만 그 값을 쿼리 글자에 박아 넣고(format %L - 따옴표를 안전하게 감싼다)
-- 실행 때마다 계획을 새로 세운다. 키워드 하위 조회는 offset 0 으로 따로 세우고,
-- 활성 공고로 좁히고, PGroonga 전용 &@ 로 찾는다(아래 주석).
-- 나머지 계산·돌려주는 모양은 0073 과 같다.

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
    -- 키워드는 본문까지 봐야 해서 좁은 표에 없다. 원래 표에서 찾는다 (0061 의 PGroonga 인덱스).
    -- offset 0 은 이 하위 조회를 따로 세우게 하는 울타리다. 없으면 DB 가 활성 공고 11만 건마다
    -- 원래 표를 한 줄씩 찾아가 키워드를 대조해(본문을 디스크에서 읽어) 4~5초가 걸렸다.
    -- 울타리 안에서는 인덱스로 맞는 공고를 먼저 다 찾고, 그 목록과 맞춘다.
    -- 활성 공고만 볼 때는 하위 조회도 활성 공고로 좁힌다. 안 좁히면 마감 공고까지 25만 건에서
    -- 키워드를 찾아 "운전" 2.2초, 좁히면 0.1초였다.
    -- 맞춰 보는 연산은 ilike 대신 PGroonga 전용 &@ 를 쓴다. ilike 는 인덱스가 찾은 공고마다
    -- 긴 본문을 다시 꺼내 대조해 "요양"(2.9만 건)에서 6초가 걸렸고, &@ 는 0.8초였다.
    -- &@ 도 대소문자를 가리지 않고 글자 그대로 찾는다(찾은 건수 29,273 -> 29,272).
    v_keyword_clause := format(
      'and f.id in (select k.id from public.jobs k where %2$s (k.title &@ %1$L or k.company_name &@ %1$L or k.description &@ %1$L) offset 0)',
      v_keyword,
      case when coalesce((p_filter->>'active_only')::boolean, true)
           then 'k.is_active = true and k.status = ''published'' and' else '' end
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

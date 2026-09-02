-- 0070: search_jobs_scored 를 빠르게.
--
-- 0068 은 한 줄마다 jsonb 배열을 펼치는 서브쿼리를 세 번 돌리고, 공고 전체 칼럼(raw_payload 포함)을
-- 실은 채로 7만 건을 정렬했다. 전체 지역 기준 HTTP 왕복이 0.7~1.9초였다.
-- - 직종 앞자리는 text[] 로 바꿔 LIKE ANY 로 본다 (서브쿼리 없음)
-- - 운전·관심 태그·자격 가점은 프로필에 그 재료가 있을 때만 계산한다 (CASE 로 건너뜀)
-- - 점수·정렬은 id 와 정렬 키만 들고 하고, 잘라낸 20건에만 공고 본문을 붙인다
-- 가중치는 그대로 (evaluateJobFit 과 동일).

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
    from public.jobs f, prof, flt
    where (not flt.active_only or (f.is_active and f.status = 'published'))
      and (flt.region is null or f.region = flt.region)
      and (jsonb_array_length(flt.sigungus) = 0 or flt.sigungus ? coalesce(f.region_sigungu, ''))
      and (cardinality(flt.category_patterns) = 0 or f.job_category like any (flt.category_patterns))
      and (not flt.beginner_only or f.is_beginner_friendly)
      and (flt.closing_within_days is null
           or (f.apply_deadline is not null
               and f.apply_deadline >= now()
               and f.apply_deadline <= now() + make_interval(days => flt.closing_within_days)))
      and (flt.keyword is null
           or f.title ilike '%' || flt.keyword || '%'
           or f.company_name ilike '%' || flt.keyword || '%'
           or f.description ilike '%' || flt.keyword || '%')
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

-- 0068: 추천순을 회원 매칭 점수로 진짜 정렬한다.
--
-- 전에는 DB 가 공고에 매겨 둔 중장년 추천도 순으로 한 페이지(20건)를 자른 뒤,
-- 그 20건 안에서만 회원 점수로 다시 줄을 세웠다. 페이지 바깥의 더 잘 맞는 공고는
-- 영영 앞에 오지 못했다. 점수를 DB 에서 매겨 전체 결과를 정렬하고 나서 자른다.
--
-- 가중치는 src/services/job-match.service.ts 의 evaluateJobFit 과 같아야 한다
-- (희망 직종 30 · 희망 지역 20 · 급여 15 · 근무형태 10 · 신입가능+재취업 준비 15
--  · 운전 10 · 관심 태그 8/개 최대 16 · (준)고령자 우대 8 · 필요 자격 보유 12).
-- 화면의 "왜 이 점수인지"는 여전히 evaluateJobFit 이 만들고, 여기서는 순서만 정한다.
--
-- p_profile: {
--   desired_prefixes: text[] (직종 코드 앞자리), region, salary_min, salary_max,
--   work_types: text[], career_open: bool, can_drive: bool, interest_tags: text[],
--   midlife_age: bool, held_qualifications: text[]
-- }
-- p_filter: { active_only, region, sigungus: text[], category_prefixes: text[],
--   beginner_only, closing_within_days, keyword }  (/jobs 검색바가 쓰는 조건만)

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
      coalesce(p_profile->'desired_prefixes', '[]'::jsonb) as prefixes,
      p_profile->>'region' as region,
      (p_profile->>'salary_min')::numeric as salary_min,
      (p_profile->>'salary_max')::numeric as salary_max,
      coalesce(p_profile->'work_types', '[]'::jsonb) as work_types,
      coalesce((p_profile->>'career_open')::boolean, false) as career_open,
      coalesce((p_profile->>'can_drive')::boolean, false) as can_drive,
      coalesce(p_profile->'interest_tags', '[]'::jsonb) as interest_tags,
      coalesce((p_profile->>'midlife_age')::boolean, false) as midlife_age,
      coalesce(p_profile->'held_qualifications', '[]'::jsonb) as held_quals
  ),
  flt as (
    select
      coalesce((p_filter->>'active_only')::boolean, true) as active_only,
      p_filter->>'region' as region,
      coalesce(p_filter->'sigungus', '[]'::jsonb) as sigungus,
      coalesce(p_filter->'category_prefixes', '[]'::jsonb) as category_prefixes,
      coalesce((p_filter->>'beginner_only')::boolean, false) as beginner_only,
      (p_filter->>'closing_within_days')::int as closing_within_days,
      nullif(trim(p_filter->>'keyword'), '') as keyword
  ),
  filtered as (
    select j.*
    from public.jobs j, flt
    where (not flt.active_only or (j.is_active and j.status = 'published'))
      and (flt.region is null or j.region = flt.region)
      and (jsonb_array_length(flt.sigungus) = 0 or flt.sigungus ? coalesce(j.region_sigungu, ''))
      and (jsonb_array_length(flt.category_prefixes) = 0
           or exists (select 1 from jsonb_array_elements_text(flt.category_prefixes) p where j.job_category like p || '%'))
      and (not flt.beginner_only or j.is_beginner_friendly)
      and (flt.closing_within_days is null
           or (j.apply_deadline is not null
               and j.apply_deadline >= now()
               and j.apply_deadline <= now() + make_interval(days => flt.closing_within_days)))
      and (flt.keyword is null
           or j.title ilike '%' || flt.keyword || '%'
           or j.company_name ilike '%' || flt.keyword || '%'
           or j.description ilike '%' || flt.keyword || '%')
  ),
  scored as (
    select
      f.*,
      (
        case when exists (select 1 from jsonb_array_elements_text(prof.prefixes) p where f.job_category like p || '%') then 30 else 0 end
        + case when prof.region is not null and f.region = prof.region then 20 else 0 end
        + case when (prof.salary_min is not null or prof.salary_max is not null)
                    and coalesce(f.salary_max, f.salary_min, 1e12) >= coalesce(prof.salary_min, 0)
                    and coalesce(f.salary_min, 0) <= coalesce(prof.salary_max, 1e12)
               then 15 else 0 end
        + case when prof.work_types ? f.work_type then 10 else 0 end
        + case when f.is_beginner_friendly and prof.career_open then 15 else 0 end
        + case when prof.can_drive
                    and (coalesce(f.preferential_codes, '[]'::jsonb) ? '14'
                         or exists (select 1 from jsonb_array_elements_text(coalesce(f.tags, '[]'::jsonb)) t where t like '%운전%'))
               then 10 else 0 end
        + least(16, 8 * (select count(*) from jsonb_array_elements_text(coalesce(f.tags, '[]'::jsonb)) t where prof.interest_tags ? t))
        + case when prof.midlife_age and coalesce(f.preferential_codes, '[]'::jsonb) ? 'B' then 8 else 0 end
        + case when jsonb_array_length(coalesce(f.preferred_qualifications, '[]'::jsonb)) > 0
                    and prof.held_quals @> coalesce(f.preferred_qualifications, '[]'::jsonb)
               then 12 else 0 end
      )::int as match_score
    from filtered f, prof
  )
  select
    -- 원본 응답(raw_payload)은 목록에 쓰지 않는데 한 건당 수 KB 라 뺀다.
    to_jsonb(s) - 'match_score' - 'raw_payload' as job,
    s.match_score,
    count(*) over () as total_count
  from scored s
  order by s.match_score desc, s.midlife_recommendation_score desc nulls last, s.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

comment on function public.search_jobs_scored(jsonb, jsonb, int, int)
  is '회원 매칭 점수순 공고 검색. 가중치는 evaluateJobFit(job-match.service.ts)과 같아야 한다.';

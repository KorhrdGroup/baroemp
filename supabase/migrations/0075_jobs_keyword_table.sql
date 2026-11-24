-- 0075: 키워드 검색용 좁은 표(jobs_keyword)를 두고 추천순 검색이 거기서 키워드를 찾게 한다.
--
-- 0074 뒤에도 "요양"(활성 2.9만 건)은 2.5~3.9초였다. 실행 계획을 보니 점수 계산은 0.2초이고,
-- 나머지는 키워드에 맞는 공고가 활성인지 보려고 큰 jobs 표(554MB)를 디스크에서 읽는 시간이었다
-- (14,185 블록). 제목·회사명·본문만 담은 표(57MB)로 같은 조회를 해 보니 0.27초였다("운전" 0.08초).
--
-- 0073 의 jobs_search 처럼 jobs 가 바뀔 때 트리거로 따라 바꾸고, 지울 때는 외래 키가 같이 지운다.
-- 공고 동기화 코드는 그대로다.
--
-- 되돌리려면 0074 의 함수를 다시 만들고 트리거·표를 지우면 된다.

create table if not exists public.jobs_keyword (
  id uuid primary key references public.jobs (id) on delete cascade,
  title text,
  company_name text,
  description text
);

-- 서버(service role)만 쓰는 내부 표다. 공개 API 로 읽히지 않게 정책 없이 RLS 만 켠다.
alter table public.jobs_keyword enable row level security;

create or replace function public.sync_jobs_keyword()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.jobs_keyword (id, title, company_name, description)
  values (new.id, new.title, new.company_name, new.description)
  on conflict (id) do update set
    title = excluded.title,
    company_name = excluded.company_name,
    description = excluded.description;
  return null;
end;
$$;

drop trigger if exists trg_jobs_keyword_sync on public.jobs;
create trigger trg_jobs_keyword_sync
  after insert or update of title, company_name, description on public.jobs
  for each row execute function public.sync_jobs_keyword();

-- 트리거를 먼저 걸고 채운다. 채우는 사이 바뀐 공고는 트리거가 이미 넣었으므로 건너뛴다.
insert into public.jobs_keyword (id, title, company_name, description)
select id, title, company_name, description from public.jobs
on conflict (id) do nothing;

-- 인덱스는 다 채운 뒤에 만든다(한 건씩 넣으며 만드는 것보다 빠르다). 0061 과 같은 PGroonga 다.
create index if not exists jobs_keyword_title_pgroonga_idx on public.jobs_keyword using pgroonga (title);
create index if not exists jobs_keyword_company_name_pgroonga_idx on public.jobs_keyword using pgroonga (company_name);
create index if not exists jobs_keyword_description_pgroonga_idx on public.jobs_keyword using pgroonga (description);

analyze public.jobs_keyword;

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

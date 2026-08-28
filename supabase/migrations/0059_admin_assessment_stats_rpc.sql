-- 0059_admin_assessment_stats_rpc.sql
-- 통계 > 직업진단 탭 집계.
--
-- 기존 assessment-analytics.service는 세션·결과를 findAll()로 전량 끌어와 세고,
-- 연령대는 mock 사용자 배열에서 가져온다. 실데이터로는 쓸 수 없어 집계를 새로 둔다.
--
-- 재실행 안전: create or replace.

/* 단계별 진행. 어느 분류에서 멈췄는지가 문항을 손볼 지점이다. */
create or replace function public.admin_assessment_progress(p_since timestamptz)
returns table (status text, section text, session_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select status, coalesce(current_section, ''), count(*)
  from public.assessment_sessions
  where started_at >= p_since
  group by 1, 2
  order by 3 desc;
$$;

/* 완료까지 걸린 시간(분). 1시간을 넘는 건 창을 열어둔 것이라 평균에서 뺀다. */
create or replace function public.admin_assessment_duration(p_since timestamptz)
returns table (avg_minutes numeric, median_minutes numeric, sample_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with spans as (
    select extract(epoch from (completed_at - started_at)) / 60 as minutes
    from public.assessment_sessions
    where status = 'completed'
      and completed_at is not null
      and started_at >= p_since
  ), valid as (
    select minutes from spans where minutes > 0 and minutes < 60
  )
  select
    round(avg(minutes)::numeric, 1),
    round((percentile_cont(0.5) within group (order by minutes))::numeric, 1),
    count(*)
  from valid;
$$;

/*
 * 1순위로 추천된 직업. 결과 jsonb에서 첫 원소만 꺼낸다.
 * 연령대는 mock이 아니라 career_profiles에서 가져와 실제 회원 것만 센다.
 */
create or replace function public.admin_assessment_recommendations(p_since timestamptz)
returns table (
  occupation_name text,
  reco_count bigint,
  avg_score numeric,
  top_age_group text
)
language sql
stable
security definer
set search_path = public
as $$
  with firsts as (
    select
      r.recommended_occupations -> 0 ->> 'occupationName' as occupation_name,
      (r.recommended_occupations -> 0 ->> 'totalScore')::numeric as total_score,
      cp.age_group
    from public.assessment_results r
    left join public.career_profiles cp on cp.user_id = r.user_id
    where r.completed_at >= p_since
      and r.recommended_occupations -> 0 ->> 'occupationName' is not null
  ), ranked_age as (
    select occupation_name, age_group, count(*) as n,
           row_number() over (partition by occupation_name order by count(*) desc) as rn
    from firsts
    where age_group is not null
    group by 1, 2
  )
  select
    f.occupation_name,
    count(*) as reco_count,
    round(avg(f.total_score), 1) as avg_score,
    max(ra.age_group) filter (where ra.rn = 1) as top_age_group
  from firsts f
  left join ranked_age ra on ra.occupation_name = f.occupation_name
  group by f.occupation_name
  order by reco_count desc, avg_score desc;
$$;

/*
 * 문항별 응답 수. 앞 문항 대비 얼마나 떨어졌는지 보면 어느 문항이 사람을 막는지 드러난다.
 *
 * 단, profile_field가 있는 문항은 취업 프로필에 값이 있으면 건너뛴다.
 * 응답 수가 적은 것이 이탈이 아니라 생략이므로 is_skippable로 구분해 내보낸다.
 */
create or replace function public.admin_assessment_question_dropoff(p_since timestamptz)
returns table (
  order_index int,
  question_text text,
  section text,
  answered_count bigint,
  is_skippable boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.order_index,
    q.question_text,
    q.section,
    count(distinct a.session_id),
    q.profile_field is not null
  from public.assessment_questions q
  left join public.assessment_answers a on a.question_id = q.id
  left join public.assessment_sessions s on s.id = a.session_id and s.started_at >= p_since
  where s.id is not null
  group by q.order_index, q.question_text, q.section, q.profile_field
  order by q.order_index;
$$;

revoke all on function public.admin_assessment_progress(timestamptz) from anon;
revoke all on function public.admin_assessment_duration(timestamptz) from anon;
revoke all on function public.admin_assessment_recommendations(timestamptz) from anon;
revoke all on function public.admin_assessment_question_dropoff(timestamptz) from anon;
grant execute on function public.admin_assessment_progress(timestamptz) to authenticated, service_role;
grant execute on function public.admin_assessment_duration(timestamptz) to authenticated, service_role;
grant execute on function public.admin_assessment_recommendations(timestamptz) to authenticated, service_role;
grant execute on function public.admin_assessment_question_dropoff(timestamptz) to authenticated, service_role;

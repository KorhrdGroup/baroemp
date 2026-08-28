-- 0054_admin_member_composition_rpc.sql
-- 통계 > 회원 구성 탭 집계.
--
-- 클라이언트로 행을 끌어와 세면 PostgREST 기본 1000행 상한에 조용히 걸려
-- 회원이 늘어난 뒤부터 숫자가 틀어진다. 세는 일은 전부 SQL에서 끝낸다.
--
-- 재실행 안전: create or replace.

/* 연령대·취업상태 분포. 아직 값을 안 넣은 회원은 null 키로 함께 나온다. */
create or replace function public.admin_member_composition()
returns table (dimension text, key text, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select 'age_group', coalesce(age_group, ''), count(*)
  from public.career_profiles
  group by 1, 2
  union all
  select 'employment_status', coalesce(employment_status, ''), count(*)
  from public.career_profiles
  group by 1, 2;
$$;

/* 지원금 진단이 어느 지역에서 나왔는지. answers는 jsonb라 SQL에서 바로 꺼낸다. */
create or replace function public.admin_support_region_counts(p_since timestamptz)
returns table (region text, session_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(answers->>'region', ''), count(*)
  from public.support_assessment_sessions
  where started_at >= p_since
  group by 1
  order by 2 desc;
$$;

/* 일자별 신규 가입. KPI 카드의 스파크라인이 쓴다. */
create or replace function public.admin_daily_signups(p_since timestamptz)
returns table (day date, signup_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select (created_at at time zone 'Asia/Seoul')::date, count(*)
  from public.profiles
  where created_at >= p_since
  group by 1
  order by 1;
$$;

/* 회원/비회원 조회 비중. 가입 유도가 필요한 지점인지 보는 값이다. */
create or replace function public.admin_event_actor_split(p_since timestamptz)
returns table (member_events bigint, anonymous_events bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where user_id is not null),
    count(*) filter (where user_id is null)
  from public.activity_events
  where occurred_at >= p_since;
$$;

revoke all on function public.admin_member_composition() from anon;
revoke all on function public.admin_support_region_counts(timestamptz) from anon;
revoke all on function public.admin_daily_signups(timestamptz) from anon;
revoke all on function public.admin_event_actor_split(timestamptz) from anon;
grant execute on function public.admin_member_composition() to authenticated, service_role;
grant execute on function public.admin_support_region_counts(timestamptz) to authenticated, service_role;
grant execute on function public.admin_daily_signups(timestamptz) to authenticated, service_role;
grant execute on function public.admin_event_actor_split(timestamptz) to authenticated, service_role;

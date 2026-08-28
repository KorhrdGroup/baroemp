-- 0056_admin_support_resume_stats_rpc.sql
-- 통계 > 지원금·이력서 탭 집계.
--
-- 기존 support/resume analytics 서비스는 getRecentEvents(3000)과 findAll()에 기대고 있어
-- 데이터가 쌓이면 조용히 어긋난다. 새 탭이 쓰는 집계는 SQL에서 끝낸다.
--
-- 재실행 안전: create or replace.

/* 지원금 진단 진행 상태. 완료율의 분모·분자가 여기서 나온다. */
create or replace function public.admin_support_progress(p_since timestamptz)
returns table (status text, session_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select status, count(*)
  from public.support_assessment_sessions
  where started_at >= p_since
  group by 1
  order by 2 desc;
$$;

/*
 * 완료한 진단의 특정 답변 분포. answers가 jsonb라 키를 인자로 받아 한 함수로 쓴다.
 * 지역·취업상태·소득 등 축이 늘어도 함수를 더 만들지 않는다.
 */
create or replace function public.admin_support_answer_breakdown(p_since timestamptz, p_key text)
returns table (answer_value text, session_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(answers->>p_key, ''), count(*)
  from public.support_assessment_sessions
  where started_at >= p_since
    and status = 'completed'
  group by 1
  order by 2 desc;
$$;

/*
 * 이력서 현황. 작성상태·첨삭상태·템플릿을 한 번에 받아 화면에서 축별로 접는다.
 * document_type은 실제 데이터가 전부 비어 있어 축으로 쓰지 않는다(status가 대신 답한다).
 */
create or replace function public.admin_resume_stats(p_since timestamptz)
returns table (
  status text,
  review_status text,
  template_id text,
  resume_count bigint,
  avg_completeness numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(resumes.status, ''),
    coalesce(resumes.review_status, ''),
    -- template_id는 uuid라 coalesce 전에 text로 눕혀야 빈 문자열과 섞을 수 있다.
    coalesce(resumes.template_id::text, ''),
    count(*),
    round(avg(coalesce(resumes.completeness, 0))::numeric, 1)
  from public.resumes
  where resumes.created_at >= p_since
  group by 1, 2, 3;
$$;

revoke all on function public.admin_support_progress(timestamptz) from anon;
revoke all on function public.admin_support_answer_breakdown(timestamptz, text) from anon;
revoke all on function public.admin_resume_stats(timestamptz) from anon;
grant execute on function public.admin_support_progress(timestamptz) to authenticated, service_role;
grant execute on function public.admin_support_answer_breakdown(timestamptz, text) to authenticated, service_role;
grant execute on function public.admin_resume_stats(timestamptz) to authenticated, service_role;

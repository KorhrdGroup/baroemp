-- 0053_admin_stats_rpc.sql
-- 관리자 통계·엑셀 내보내기용 집계 함수.
--
-- 기존 분석 서비스는 activityEventLogger.getRecentEvents(3000)으로 최근 3000건만
-- 메모리에 올려 필터한다. 이벤트가 쌓이면 통계가 조용히 "최근 3000건 기준"으로 바뀌므로,
-- 새로 만드는 집계는 SQL에서 끝낸다. PostgREST는 group by를 지원하지 않아 RPC로 둔다.
--
-- 재실행 안전: create or replace + if not exists.

-- 집계가 항상 기간·종류로 훑으므로 두 컬럼에 인덱스를 둔다.
create index if not exists activity_events_occurred_at_idx
  on public.activity_events (occurred_at desc);
create index if not exists activity_events_entity_idx
  on public.activity_events (entity_type, entity_id);

/*
 * 일자별 이벤트 수. 통계 페이지의 "얼마나 쓰나" 구역이 쓴다.
 * 날짜는 KST 기준으로 자른다 - 운영진이 보는 "어제"는 UTC 자정이 아니다.
 */
create or replace function public.admin_event_daily_counts(p_since timestamptz)
returns table (day date, event_type text, event_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (occurred_at at time zone 'Asia/Seoul')::date as day,
    activity_events.event_type,
    count(*) as event_count
  from public.activity_events
  where occurred_at >= p_since
  group by 1, 2
  order by 1, 2;
$$;

/*
 * 공고별 관심 집계. 상세가 한 번이라도 열린 공고만 나온다.
 *
 * 순방문자를 함께 내는 이유: 조회수 총합은 한 사람의 연타나 크롤러로 쉽게 오염되지만
 * 순방문자는 그렇지 않다. 둘의 비(1인당 조회)가 "유심히 본" 정도에 가장 가깝다.
 */
create or replace function public.admin_job_interest(p_since timestamptz)
returns table (
  job_id text,
  unique_viewers bigint,
  view_count bigint,
  bookmark_count bigint,
  apply_click_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    entity_id as job_id,
    count(distinct coalesce(user_id::text, anonymous_id))
      filter (where event_type = 'job_detail_viewed') as unique_viewers,
    count(*) filter (where event_type = 'job_detail_viewed') as view_count,
    count(*) filter (where event_type = 'job_bookmarked') as bookmark_count,
    count(*) filter (where event_type = 'job_apply_clicked') as apply_click_count
  from public.activity_events
  where entity_type = 'job'
    and entity_id is not null
    and occurred_at >= p_since
  group by entity_id
  -- 상세를 연 적이 없는 공고는 목록·찜만 스쳐간 것이라 관심으로 보지 않는다.
  having count(*) filter (where event_type = 'job_detail_viewed') > 0
  order by unique_viewers desc, view_count desc;
$$;

-- 두 함수 모두 관리자 화면에서만 호출한다. 라우트에서 requireAdmin으로 막고,
-- 여기서는 익명 롤의 직접 호출만 차단한다.
revoke all on function public.admin_event_daily_counts(timestamptz) from anon;
revoke all on function public.admin_job_interest(timestamptz) from anon;
grant execute on function public.admin_event_daily_counts(timestamptz) to authenticated, service_role;
grant execute on function public.admin_job_interest(timestamptz) to authenticated, service_role;

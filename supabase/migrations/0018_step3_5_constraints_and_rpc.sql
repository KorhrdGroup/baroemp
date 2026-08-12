-- 0018_step3_5_constraints_and_rpc.sql
-- STEP 3.5 안정화: 영속화 과정에서 발견된 누락 컬럼 보완 + Index/Constraint 보강 +
-- anonymous_id -> user_id 병합을 위한 원자적(트랜잭션) RPC 함수.
--
-- 기존 migration 파일은 수정하지 않고 이 파일에서만 추가/보완한다.

-- ────────────────────────────────────────────────────────────────
-- 1) 누락 컬럼 보완
-- ────────────────────────────────────────────────────────────────

-- assessment_sessions: AssessmentSession.currentSection을 저장할 컬럼이 없었다.
-- (0006/0016 어디에도 current_section이 없어 진행 중인 섹션 정보가 저장되지 않고 있었다)
alter table public.assessment_sessions
  add column if not exists current_section text not null default 'basic';

-- ────────────────────────────────────────────────────────────────
-- 2) Index / Constraint Audit (섹션 7)
-- ────────────────────────────────────────────────────────────────

-- content_recommendation_rules: 동일 content_id + field + operator + value 조합의
-- 완전 중복 규칙이 쌓일 수 있었다. 실수로 같은 규칙을 두 번 등록하는 것을 방지한다.
create unique index if not exists content_recommendation_rules_uidx
  on public.content_recommendation_rules (content_id, field, operator, value);

-- assessment_results: user/anonymous별 최신순 조회 성능 (관리자 상세/마이페이지에서 사용).
create index if not exists idx_assessment_results_user_completed
  on public.assessment_results (user_id, completed_at desc);
create index if not exists idx_assessment_results_anonymous_completed
  on public.assessment_results (anonymous_id, completed_at desc);

-- assessment_sessions: anonymous_id/user_id 별 최신 세션 조회 (이미 0016에 단일 컬럼 인덱스가
-- 있지만, "가장 최근 세션" 조회에 필요한 정렬 컬럼을 포함한 복합 인덱스를 추가한다).
create index if not exists idx_assessment_sessions_user_started
  on public.assessment_sessions (user_id, started_at desc);
create index if not exists idx_assessment_sessions_anonymous_started
  on public.assessment_sessions (anonymous_id, started_at desc);

-- match_results: 동일 사용자의 특정 대상(target)에 대한 매칭 결과는 최신 1건만 유지한다
-- (과거 스냅샷은 assessment_results.recommended_occupations로 재현 가능하므로,
--  match_results는 "현재 유효한 매칭"만 담는 테이블로 운용한다).
-- 0012에서 만든 user_id 기준 unique index는 유지하고, 비회원(anonymous_id) 기준
-- 중복도 동일하게 막는다.
create unique index if not exists match_results_anonymous_target_uidx
  on public.match_results (anonymous_id, target_type, target_id)
  where anonymous_id is not null;

-- user_job_interests: interest_score 기준 조회 성능 (이미 0014에 있으나 anonymous 버전 보강).
create index if not exists idx_user_job_interests_anonymous_score
  on public.user_job_interests (anonymous_id, interest_score desc);

-- ────────────────────────────────────────────────────────────────
-- 3) anonymous_id -> user_id 원자적 병합 RPC
-- ────────────────────────────────────────────────────────────────
-- Postgres 함수 본문은 기본적으로 하나의 트랜잭션으로 실행되므로, 중간에 예외가 발생하면
-- 전체가 롤백된다 ("반쪽만 이동"하는 상태를 방지). Service Role Client에서
-- `client.rpc('link_anonymous_career_data', {...})`로 호출한다 (identity-link.service.ts 참고).
create or replace function public.link_anonymous_career_data(
  p_anonymous_id text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linked_sessions integer := 0;
  v_linked_results integer := 0;
  v_linked_job_interests integer := 0;
  v_linked_match_results integer := 0;
  v_linked_activity_events integer := 0;
begin
  if p_anonymous_id is null or length(trim(p_anonymous_id)) = 0 then
    return jsonb_build_object(
      'linked_sessions', 0, 'linked_results', 0, 'linked_job_interests', 0,
      'linked_match_results', 0, 'linked_activity_events', 0
    );
  end if;

  -- SECURITY DEFINER 함수이므로 실행 권한을 service_role로 제한하는 것이 1차 방어선이지만,
  -- 혹시 다른 role에 EXECUTE가 부여되더라도 "내 계정이 아닌 곳으로 병합"을 막기 위해
  -- auth.uid()가 있는 요청(anon/authenticated JWT 경유)이면 본인 확인을 강제한다.
  -- service_role 경유 호출은 auth.uid()가 null이므로 이 체크를 통과한다.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'link_anonymous_career_data: not authorized to link data to another user';
  end if;

  -- assessment_sessions
  update public.assessment_sessions
    set user_id = p_user_id, anonymous_id = null
    where anonymous_id = p_anonymous_id;
  get diagnostics v_linked_sessions = row_count;

  -- assessment_results
  update public.assessment_results
    set user_id = p_user_id, anonymous_id = null
    where anonymous_id = p_anonymous_id;
  get diagnostics v_linked_results = row_count;

  -- user_job_interests: 동일 occupation_id에 대해 이미 회원 소유 행이 있으면
  -- 비회원 행을 지우고(중복 방지), 없으면 회원 소유로 전환한다.
  delete from public.user_job_interests anon_row
    where anon_row.anonymous_id = p_anonymous_id
      and exists (
        select 1 from public.user_job_interests user_row
        where user_row.user_id = p_user_id
          and user_row.occupation_id = anon_row.occupation_id
      );

  update public.user_job_interests
    set user_id = p_user_id, anonymous_id = null
    where anonymous_id = p_anonymous_id;
  get diagnostics v_linked_job_interests = row_count;

  -- match_results: 동일 target에 대해 회원 소유 행이 already 있으면 예전 회원 행을 지우고
  -- 비회원(더 최근에 계산됐을 가능성이 높은) 행을 회원 소유로 전환한다.
  delete from public.match_results user_row
    where user_row.user_id = p_user_id
      and exists (
        select 1 from public.match_results anon_row
        where anon_row.anonymous_id = p_anonymous_id
          and anon_row.target_type = user_row.target_type
          and anon_row.target_id = user_row.target_id
      );

  update public.match_results
    set user_id = p_user_id, source_id = p_user_id::text, anonymous_id = null
    where anonymous_id = p_anonymous_id;
  get diagnostics v_linked_match_results = row_count;

  -- activity_events: 이미 user_id가 있는 행은 건너뛴다 (다른 사용자로 잘못 덮어쓰지 않도록).
  update public.activity_events
    set user_id = p_user_id, anonymous_id = null
    where anonymous_id = p_anonymous_id and user_id is null;
  get diagnostics v_linked_activity_events = row_count;

  -- 병합 기록 (감사 로그)
  insert into public.anonymous_identity_links (anonymous_id, user_id)
    values (p_anonymous_id, p_user_id)
    on conflict (anonymous_id, user_id) do nothing;

  return jsonb_build_object(
    'linked_sessions', v_linked_sessions,
    'linked_results', v_linked_results,
    'linked_job_interests', v_linked_job_interests,
    'linked_match_results', v_linked_match_results,
    'linked_activity_events', v_linked_activity_events
  );
end;
$$;

comment on function public.link_anonymous_career_data(text, uuid) is
  '비회원(anonymous_id) 검사 세션/결과/관심직업/매칭결과/활동이벤트를 회원(user_id)으로 원자적으로 병합한다. identity-link.service.ts에서 호출.';

-- SECURITY DEFINER 함수는 기본적으로 PUBLIC에 EXECUTE 권한이 부여되므로 명시적으로 제한한다.
-- p_user_id를 호출자가 임의로 지정할 수 있어, anon/authenticated에 열어두면 다른 사용자의
-- 비회원 데이터를 가로챌 수 있는 위험이 있다 (함수 본문의 auth.uid() 체크는 방어선이며,
-- 기본 정책은 service_role(서버)에서만 호출하는 것이다).
revoke execute on function public.link_anonymous_career_data(text, uuid) from public;
grant execute on function public.link_anonymous_career_data(text, uuid) to service_role;

-- 0049_dedupe_assessment_results_per_session.sql
--
-- 검사 결과 화면이 특정 세션에서 통째로 열리지 않는 오류가 있었다.
-- findBySessionId 는 세션당 결과 한 건을 전제하는데(maybeSingle), 마지막 문항 제출이
-- 중복 실행되면서(더블클릭·재시도) 같은 세션에 결과가 4초 간격으로 두 건 저장돼
-- PGRST116("Results contain 2 rows")로 실패했다.
--
-- 애플리케이션 쪽도 함께 고쳤다.
--  - completeAssessmentSession: 이미 결과가 있으면 새로 만들지 않고 기존 것을 돌려준다
--  - findBySessionId: 과거에 쌓인 중복 데이터에도 견디도록 최신 한 건만 집어 온다
-- 다만 중복이 애초에 생기지 않는 것이 맞으므로 데이터 정리와 제약을 함께 둔다.

delete from public.assessment_results r
using public.assessment_results keep
where r.session_id = keep.session_id
  and r.id <> keep.id
  and (
    r.completed_at < keep.completed_at
    or (r.completed_at = keep.completed_at and r.id < keep.id)
  );

create unique index if not exists assessment_results_session_id_key
  on public.assessment_results (session_id);

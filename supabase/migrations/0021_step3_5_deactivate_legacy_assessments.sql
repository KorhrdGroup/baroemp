-- 0021_step3_5_deactivate_legacy_assessments.sql
-- 실제 원격 Supabase 프로젝트에 전체 Flow(E2E)를 검증하는 과정에서 발견한 버그 수정.
--
-- 0015_seed.sql이 만든 3개의 placeholder assessment(직업적합도 검사/재취업가능성 검사/지원금진단)는
-- assessment_questions가 전혀 연결되어 있지 않아 사용자가 절대 완료할 수 없다.
-- 그런데 is_active = true 로 남아있어서, "활성 검사 중 아무거나 하나"를 고르는 로직
-- (getActiveDefaultAssessment)이 실제 V2 검사(0017_assessment_v2_seed.sql, 문항 25개) 대신
-- 이 빈 placeholder를 골라버리면 검사 시작 화면이 완전히 깨지는 문제를 실제 DB 검증 중 발견했다.
--
-- 애플리케이션 코드(getActiveDefaultAssessment)도 "문항이 있는 검사 우선"으로 방어 로직을 추가했지만,
-- 문항이 아예 없는 검사를 "활성"으로 관리자 화면 등에 계속 노출하는 것 자체가 잘못된 운영 데이터이므로
-- "문항이 하나도 연결되지 않은 assessment"를 데이터 차원에서도 비활성화한다.

update public.assessments a
set is_active = false, updated_at = now()
where a.is_active = true
  and not exists (
    select 1 from public.assessment_questions q where q.assessment_id = a.id
  );

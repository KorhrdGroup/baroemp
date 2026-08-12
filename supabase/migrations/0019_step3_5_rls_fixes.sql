-- 0019_step3_5_rls_fixes.sql
-- STEP 3.5 RLS Audit 결과 발견한 오류/누락 보완.
-- 기존 0013_rls.sql은 수정하지 않고 필요한 정책만 교체/추가한다.

-- ────────────────────────────────────────────────────────────────
-- 1) 버그 수정: occupations / qualifications public read 정책이
--    실제 도메인 값(PublishStatus: draft/published/archived)이 아닌
--    'active'를 검사하고 있었다. 정상 배포된(published) 직업/자격 데이터가
--    실제로는 비로그인 사용자에게 전혀 조회되지 않는 상태였다.
--    (현재는 서비스 코드가 항상 Service Role 클라이언트로 우회 조회하기 때문에
--     기능 장애로 드러나지 않았지만, RLS만 켜진 다른 클라이언트에서는 즉시 드러나는 버그다)
-- ────────────────────────────────────────────────────────────────

drop policy if exists occupations_public_read on public.occupations;
create policy occupations_public_read on public.occupations
  for select using (status = 'published' or public.is_staff(auth.uid()));

drop policy if exists qualifications_public_read on public.qualifications;
create policy qualifications_public_read on public.qualifications
  for select using (status = 'active' or status = 'published' or public.is_staff(auth.uid()));

-- ────────────────────────────────────────────────────────────────
-- 2) occupation_matching_rules: STEP3에서 새로 생긴 테이블인데 RLS가
--    아예 켜져 있지 않았다 (0013 목록에 없었음). 추천 로직의 내부 가중치/기준값이므로
--    공개하지 않고 staff(운영/상담/관리자)만 조회, admin만 쓰기 가능하게 한다.
-- ────────────────────────────────────────────────────────────────

alter table public.occupation_matching_rules enable row level security;

create policy occupation_matching_rules_staff_read on public.occupation_matching_rules
  for select using (public.is_staff(auth.uid()));

create policy occupation_matching_rules_admin_write on public.occupation_matching_rules
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ────────────────────────────────────────────────────────────────
-- 3) 비회원 검사 흐름 재확인 (변경 없음, 문서화 목적).
--    assessment_sessions_own / assessment_results_insert (0013)는 이미
--    "user_id is null" 케이스를 with check에 포함하고 있어 비회원 삽입이 가능하다.
--    현재 앱은 검사 관련 모든 쓰기를 Server Action -> Service Role Client로 수행하므로
--    이 RLS 정책은 사실상 우회되지만, 향후 브라우저에서 anon key로 직접 쓰기를 시도해도
--    비회원 흐름이 막히지 않도록 이미 올바르게 설계되어 있음을 확인했다.
-- ────────────────────────────────────────────────────────────────

comment on policy match_results_write on public.match_results is
  'Service Role Client(서버)로만 쓰기가 발생하므로 RLS는 우회된다. anon/authenticated 키로 직접 쓰기는 admin만 허용.';

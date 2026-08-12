-- 0022_step3_5_anon_rls_readback_fix.sql
-- 실제 anon key(브라우저와 동일 권한)로 RLS를 직접 검증하는 과정에서 발견한 버그 수정.
--
-- 문제:
-- 비회원(anonymous_id) 데이터를 위해 INSERT 쪽 WITH CHECK는 "user_id IS NULL"을 허용하도록
-- 되어 있었지만(0018/0019), 대응하는 SELECT/USING(qual) 쪽에는 이 허용이 빠져 있었다.
-- PostgREST의 insert().select()(=INSERT ... RETURNING)는 INSERT 직후 방금 넣은 행을
-- 다시 SELECT 정책으로 검증하기 때문에, WITH CHECK를 통과해도 USING이 막으면
-- "new row violates row-level security policy" 오류로 실패한다.
--
-- 실제 서비스 코드는 항상 service_role(Admin Client)로만 DB에 접근하므로
-- (UI가 Supabase를 직접 호출하지 않는 아키텍처 원칙) 오늘 당장 실사용자에게 영향은 없지만,
-- RLS 정책 자체가 논리적으로 비대칭/모순되어 있었고 anon key로 직접 검증 시 실패가 재현되므로
-- 방어적으로 바로잡는다 (향후 직접 anon key를 쓰는 기능이 추가되어도 안전하도록).
--
-- user_id가 NULL인 행(=비회원 소유 행)은 "주인이 없는 행"이라는 성격상, 특정 anonymous_id
-- 소유자만 다시 읽을 수 있도록 RLS 레벨에서 구분할 방법이 없다(anonymous_id는 JWT 클레임이 아닌
-- 클라이언트가 보내는 일반 값이기 때문). 따라서 WITH CHECK와 동일한 수준으로 "user_id IS NULL이면
-- 읽기도 허용"으로 대칭을 맞춘다. 로그인 사용자 소유 행(user_id NOT NULL)은 기존과 동일하게
-- 본인/staff만 읽을 수 있다.

alter policy assessment_sessions_own on public.assessment_sessions
  using ((auth.uid() = user_id) or (user_id is null) or is_staff(auth.uid()));

alter policy assessment_answers_via_session on public.assessment_answers
  using (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = assessment_answers.session_id
        and (s.user_id = auth.uid() or s.user_id is null or is_staff(auth.uid()))
    )
  );

alter policy assessment_results_own on public.assessment_results
  using ((auth.uid() = user_id) or (user_id is null) or is_staff(auth.uid()));

alter policy activity_select on public.activity_events
  using ((auth.uid() = user_id) or (user_id is null) or is_staff(auth.uid()));

alter policy match_results_own on public.match_results
  using ((auth.uid() = user_id) or (user_id is null) or is_staff(auth.uid()));

alter policy user_job_interests_own on public.user_job_interests
  using ((auth.uid() = user_id) or (user_id is null) or is_staff(auth.uid()))
  with check ((auth.uid() = user_id) or (user_id is null) or is_admin(auth.uid()));

-- 0030_step5_support_rls_indexes.sql
-- STEP 5: 지원제도 검색 성능 Index + 신규 테이블 RLS + support_programs 공개조회 정책 보정.
-- 기존 0013_rls.sql / 0014_indexes.sql은 수정하지 않고, 정책을 drop 후 재생성한다.

-- ── Index ────────────────────────────────────────────────────────────────
create index if not exists idx_support_programs_is_active on public.support_programs (is_active) where is_active = true;
create index if not exists idx_support_programs_category on public.support_programs (category);
create index if not exists idx_support_programs_region_scope on public.support_programs (region_scope);
create index if not exists idx_support_programs_application_end_at on public.support_programs (application_end_at);
create index if not exists idx_support_programs_external_fetched on public.support_programs (external_source, fetched_at);

create index if not exists idx_support_bookmarks_user on public.support_bookmarks (user_id, created_at desc);
create index if not exists idx_support_bookmarks_program on public.support_bookmarks (support_program_id);

create index if not exists idx_support_program_rules_program on public.support_program_rules (support_program_id, status);

create index if not exists idx_support_assessment_sessions_user on public.support_assessment_sessions (user_id, started_at desc);
create index if not exists idx_support_assessment_sessions_anon on public.support_assessment_sessions (anonymous_id, started_at desc);

-- ── support_programs 공개조회: is_active까지 함께 검사하도록 재생성 (jobs_public_read와 동일한 패턴) ──
drop policy if exists support_public_read on public.support_programs;
create policy support_public_read on public.support_programs
  for select using ((status = 'published' and is_active = true) or public.is_staff(auth.uid()));

-- ── support_bookmarks: 본인만 (job_bookmarks_own과 동일한 패턴) ─────────────
alter table public.support_bookmarks enable row level security;
create policy support_bookmarks_own on public.support_bookmarks
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ── support_program_rules: 내부 판정용 데이터이므로 staff read / admin write ──
alter table public.support_program_rules enable row level security;
create policy support_program_rules_staff_read on public.support_program_rules
  for select using (public.is_staff(auth.uid()));
create policy support_program_rules_admin_write on public.support_program_rules
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── support_assessment_sessions: 본인 데이터 (assessment_sessions_own과 동일한 패턴, 비회원 세션 허용) ──
alter table public.support_assessment_sessions enable row level security;
create policy support_assessment_sessions_own on public.support_assessment_sessions
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or user_id is null or public.is_admin(auth.uid()));

-- match_results(target_type='support_program')는 0013_rls.sql의 match_results_own/write 정책이
-- targetType과 무관하게 이미 적용되므로 별도 정책이 필요 없다.

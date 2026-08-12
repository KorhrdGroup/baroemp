-- 0045_step7_5_rls_indexes.sql
-- STEP 7.5: RLS (스펙 52번).
-- 공개 Market Catalog(employment_destinations/career_requirements/job_requirements/
-- market_requirement_snapshots)는 기존 occupations/jobs와 동일한 정책(공개 조회 + 관리자 쓰기)을 따른다.
-- 개인 분석 결과(career_gap_analyses/items, user_employment_destination_interests)는 본인만 조회/쓰기 가능하다.

alter table public.employment_destinations enable row level security;
alter table public.career_requirements enable row level security;
alter table public.job_requirements enable row level security;
alter table public.market_requirement_snapshots enable row level security;
alter table public.career_gap_analyses enable row level security;
alter table public.career_gap_items enable row level security;
alter table public.user_employment_destination_interests enable row level security;

-- ── 공개 Market Catalog: 활성 상태는 누구나(비로그인 포함) 조회 가능, 관리자만 쓰기 ──
drop policy if exists employment_destinations_public_read on public.employment_destinations;
create policy employment_destinations_public_read on public.employment_destinations
  for select using (status = 'active' or public.is_staff(auth.uid()));

drop policy if exists employment_destinations_admin_write on public.employment_destinations;
create policy employment_destinations_admin_write on public.employment_destinations
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists career_requirements_public_read on public.career_requirements;
create policy career_requirements_public_read on public.career_requirements
  for select using (status = 'active' or public.is_staff(auth.uid()));

drop policy if exists career_requirements_admin_write on public.career_requirements;
create policy career_requirements_admin_write on public.career_requirements
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- job_requirements/market_requirement_snapshots는 상태 컬럼이 없는 파생 통계 데이터이므로
-- 인증된 사용자에게는 공개, 쓰기는 관리자/서비스 롤(엔진 배치)만 가능하게 한다.
drop policy if exists job_requirements_authenticated_read on public.job_requirements;
create policy job_requirements_authenticated_read on public.job_requirements
  for select using (auth.role() = 'authenticated' or public.is_staff(auth.uid()));

drop policy if exists job_requirements_admin_write on public.job_requirements;
create policy job_requirements_admin_write on public.job_requirements
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists market_snapshots_authenticated_read on public.market_requirement_snapshots;
create policy market_snapshots_authenticated_read on public.market_requirement_snapshots
  for select using (auth.role() = 'authenticated' or public.is_staff(auth.uid()));

drop policy if exists market_snapshots_admin_write on public.market_requirement_snapshots;
create policy market_snapshots_admin_write on public.market_requirement_snapshots
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ── 개인 분석 결과: 본인 + 관리자만 ──────────────────────────────────────
drop policy if exists career_gap_analyses_owner on public.career_gap_analyses;
create policy career_gap_analyses_owner on public.career_gap_analyses
  for all using (user_id = auth.uid() or public.is_staff(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists career_gap_items_owner on public.career_gap_items;
create policy career_gap_items_owner on public.career_gap_items
  for all using (
    exists (
      select 1 from public.career_gap_analyses a
      where a.id = career_gap_items.analysis_id
        and (a.user_id = auth.uid() or public.is_staff(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.career_gap_analyses a
      where a.id = career_gap_items.analysis_id
        and (a.user_id = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists user_destination_interests_owner on public.user_employment_destination_interests;
create policy user_destination_interests_owner on public.user_employment_destination_interests
  for all using (user_id = auth.uid() or public.is_staff(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

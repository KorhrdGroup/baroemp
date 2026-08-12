-- 0013_rls.sql
-- 일반 사용자: 본인 데이터 / 관리자·컨설턴트: 광범위 조회

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_acquisition enable row level security;
alter table public.career_profiles enable row level security;
alter table public.tags enable row level security;
alter table public.user_tags enable row level security;
alter table public.qualifications enable row level security;
alter table public.user_qualifications enable row level security;
alter table public.user_qualification_interests enable row level security;
alter table public.occupations enable row level security;
alter table public.user_job_interests enable row level security;
alter table public.user_content_interests enable row level security;
alter table public.contents enable row level security;
alter table public.content_tags enable row level security;
alter table public.content_recommendation_rules enable row level security;
alter table public.activity_events enable row level security;
alter table public.anonymous_identity_links enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.assessment_results enable row level security;
alter table public.jobs enable row level security;
alter table public.job_tags enable row level security;
alter table public.job_bookmarks enable row level security;
alter table public.support_programs enable row level security;
alter table public.support_program_tags enable row level security;
alter table public.resumes enable row level security;
alter table public.consultations enable row level security;
alter table public.consultation_notes enable row level security;
alter table public.leads enable row level security;
alter table public.match_results enable row level security;

-- profiles
create policy profiles_select_own_or_staff on public.profiles
  for select using (auth.uid() = id or public.is_staff(auth.uid()));
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id or public.is_admin(auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id or public.is_admin(auth.uid()));

-- career_profiles
create policy career_profiles_select on public.career_profiles
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy career_profiles_write on public.career_profiles
  for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- user_acquisition
create policy user_acquisition_select on public.user_acquisition
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy user_acquisition_write on public.user_acquisition
  for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- public read catalogs
create policy tags_public_read on public.tags for select using (true);
create policy qualifications_public_read on public.qualifications for select using (status = 'active' or public.is_staff(auth.uid()));
create policy occupations_public_read on public.occupations for select using (status = 'active' or public.is_staff(auth.uid()));
create policy contents_public_read on public.contents for select using (status = 'published' or public.is_staff(auth.uid()));
create policy content_rules_staff on public.content_recommendation_rules for select using (public.is_staff(auth.uid()) or status = 'active');
create policy jobs_public_read on public.jobs for select using (status = 'published' or public.is_staff(auth.uid()));
create policy support_public_read on public.support_programs for select using (status = 'published' or public.is_staff(auth.uid()));
create policy assessments_public_read on public.assessments for select using (is_active = true or public.is_staff(auth.uid()));
create policy assessment_questions_read on public.assessment_questions for select using (true);
create policy assessment_options_read on public.assessment_options for select using (true);

-- admin write catalogs
create policy contents_admin_write on public.contents for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy content_rules_admin_write on public.content_recommendation_rules for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy tags_admin_write on public.tags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy jobs_admin_write on public.jobs for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy support_admin_write on public.support_programs for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy qualifications_admin_write on public.qualifications for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy occupations_admin_write on public.occupations for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy assessments_admin_write on public.assessments for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- interests / qualifications owned by user
create policy user_tags_own on public.user_tags for all using (auth.uid() = user_id or public.is_staff(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy user_qualifications_own on public.user_qualifications for all using (auth.uid() = user_id or public.is_staff(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy user_qualification_interests_own on public.user_qualification_interests for all using (auth.uid() = user_id or public.is_staff(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy user_job_interests_own on public.user_job_interests for all using (auth.uid() = user_id or public.is_staff(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy user_content_interests_own on public.user_content_interests for all using (auth.uid() = user_id or public.is_staff(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy job_bookmarks_own on public.job_bookmarks for all using (auth.uid() = user_id or public.is_staff(auth.uid())) with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- activity: insert own / anonymous insert allowed for tracking; select own or staff
create policy activity_insert on public.activity_events
  for insert with check (
    user_id is null or auth.uid() = user_id or public.is_admin(auth.uid())
  );
create policy activity_select on public.activity_events
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));

create policy anonymous_links_own on public.anonymous_identity_links
  for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- assessment sessions/results/answers
create policy assessment_sessions_own on public.assessment_sessions
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or user_id is null or public.is_admin(auth.uid()));
create policy assessment_answers_via_session on public.assessment_answers
  for all using (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = session_id and (s.user_id = auth.uid() or public.is_staff(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = session_id and (s.user_id = auth.uid() or s.user_id is null or public.is_admin(auth.uid()))
    )
  );
create policy assessment_results_own on public.assessment_results
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy assessment_results_insert on public.assessment_results
  for insert with check (auth.uid() = user_id or user_id is null or public.is_admin(auth.uid()));

-- resumes / consultations / leads / matches
create policy resumes_own on public.resumes
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy consultations_own on public.consultations
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy consultations_insert_own on public.consultations
  for insert with check (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy consultations_staff_update on public.consultations
  for update using (public.is_staff(auth.uid()));
create policy consultation_notes_staff on public.consultation_notes
  for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy leads_select on public.leads
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy leads_admin_write on public.leads
  for all using (public.is_admin(auth.uid()) or public.is_staff(auth.uid()))
  with check (public.is_admin(auth.uid()) or public.is_staff(auth.uid()));
create policy match_results_own on public.match_results
  for select using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy match_results_write on public.match_results
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- content/job tag join tables readable
create policy content_tags_read on public.content_tags for select using (true);
create policy job_tags_read on public.job_tags for select using (true);
create policy support_program_tags_read on public.support_program_tags for select using (true);
create policy content_tags_admin on public.content_tags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy job_tags_admin on public.job_tags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy support_tags_admin on public.support_program_tags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy user_roles_admin on public.user_roles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy user_roles_select_own on public.user_roles for select using (auth.uid() = user_id or public.is_staff(auth.uid()));

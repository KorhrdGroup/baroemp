-- 0039_step7_resume_rls_indexes.sql
-- STEP 7: 이력서/자기소개서/Experience Bank RLS. authenticated JWT(auth.uid()) 기준으로
-- 본인 데이터만 CRUD 가능하게 하고, staff/admin은 기존 정책과 동일한 범위로 접근을 허용한다.
-- 기존 0013_rls.sql의 resumes_own 정책은 이미 (auth.uid() = user_id or is_staff/is_admin) 형태이므로
-- 컬럼이 늘어나도 그대로 유효하다 (수정하지 않음).

alter table public.resume_templates enable row level security;
alter table public.cover_letter_templates enable row level security;
alter table public.resume_educations enable row level security;
alter table public.resume_experiences enable row level security;
alter table public.resume_qualifications enable row level security;
alter table public.resume_trainings enable row level security;
alter table public.resume_skills enable row level security;
alter table public.resume_items enable row level security;
alter table public.resume_versions enable row level security;
alter table public.cover_letters enable row level security;
alter table public.cover_letter_sections enable row level security;
alter table public.experience_bank enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;

-- Template 카탈로그: 활성 Template은 누구나 조회 가능(회원가입 전 홍보/미리보기 포함), 관리자만 작성.
create policy resume_templates_read on public.resume_templates
  for select using (status = 'active' or public.is_staff(auth.uid()));
create policy resume_templates_admin_write on public.resume_templates
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy cover_letter_templates_read on public.cover_letter_templates
  for select using (status = 'active' or public.is_staff(auth.uid()));
create policy cover_letter_templates_admin_write on public.cover_letter_templates
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- resume 하위 항목: resumes.user_id 를 통해 소유권을 검사한다.
create policy resume_educations_own on public.resume_educations
  for all using (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

create policy resume_experiences_own on public.resume_experiences
  for all using (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

create policy resume_qualifications_own on public.resume_qualifications
  for all using (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

create policy resume_trainings_own on public.resume_trainings
  for all using (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

create policy resume_skills_own on public.resume_skills
  for all using (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

create policy resume_items_own on public.resume_items
  for all using (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

create policy resume_versions_own on public.resume_versions
  for all using (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.resumes r where r.id = resume_id and (r.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- 자기소개서: cover_letters.user_id 직접 컬럼으로 소유권 검사.
create policy cover_letters_own on public.cover_letters
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy cover_letter_sections_own on public.cover_letter_sections
  for all using (
    exists (select 1 from public.cover_letters c where c.id = cover_letter_id and (c.user_id = auth.uid() or public.is_staff(auth.uid())))
  )
  with check (
    exists (select 1 from public.cover_letters c where c.id = cover_letter_id and (c.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

-- Experience Bank: 본인 소유.
create policy experience_bank_own on public.experience_bank
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- skills 카탈로그: qualifications/occupations와 동일한 패턴 (공개 조회 + 관리자 작성).
create policy skills_public_read on public.skills
  for select using (status = 'active' or public.is_staff(auth.uid()));
create policy skills_admin_write on public.skills
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- user_skills: user_qualifications_own과 동일한 패턴.
create policy user_skills_own on public.user_skills
  for all using (auth.uid() = user_id or public.is_staff(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- 자주 조회되는 조합에 대한 추가 index
create index if not exists idx_cover_letters_status on public.cover_letters (user_id, status);
create index if not exists idx_resume_qualifications_user_qual on public.resume_qualifications (user_qualification_id);

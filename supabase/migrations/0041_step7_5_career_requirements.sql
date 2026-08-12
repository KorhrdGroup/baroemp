-- 0041_step7_5_career_requirements.sql
-- STEP 7.5: Career Requirement Master (스펙 9번).
-- "운전 가능자/차량운전 가능/운전면허 소지자 우대"처럼 표현이 달라도 같은 의미의 조건을
-- 하나의 canonical requirement로 묶기 위한 Requirement Normalizer의 사전(dictionary) 역할을 한다.
-- matching_type은 사용자 Career DB에서 이 조건의 충족 상태를 어떻게 계산할지를 결정한다:
--   DRIVING_FLAG      -> career_profiles.can_drive
--   QUALIFICATION     -> user_qualifications / resume_qualifications 이름 매칭
--   SKILL_KEYWORD     -> user_skills / resume_skills / career_profiles.interest_tags 이름 매칭
--   EXPERIENCE_TEXT   -> resume_experiences.responsibilities/achievements 텍스트 키워드 매칭

create table if not exists public.career_requirements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category text not null check (
    category in (
      'QUALIFICATION', 'SKILL', 'EXPERIENCE', 'DRIVING', 'EDUCATION',
      'COMPUTER', 'EMPLOYMENT_TYPE', 'WORK_SCHEDULE', 'LANGUAGE', 'PHYSICAL', 'OTHER'
    )
  ),
  description text,
  matching_type text not null default 'SKILL_KEYWORD' check (
    matching_type in ('DRIVING_FLAG', 'QUALIFICATION', 'SKILL_KEYWORD', 'EXPERIENCE_TEXT')
  ),
  related_qualification_id uuid references public.qualifications (id) on delete set null,
  related_skill_id uuid references public.skills (id) on delete set null,
  related_content_tags jsonb not null default '[]'::jsonb,
  -- Job 원문(제목/설명/자격요건 등)에서 이 조건을 탐지하기 위한 키워드 목록.
  -- 같은 목록을 사용자 Resume/Career DB 텍스트 매칭에도 재사용해 "같은 의미는 같은 canonical key"로 묶는다.
  detection_keywords jsonb not null default '[]'::jsonb,
  preparation_difficulty text not null default 'MEDIUM' check (preparation_difficulty in ('LOW', 'MEDIUM', 'HIGH')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_career_requirements_updated_at on public.career_requirements;
create trigger trg_career_requirements_updated_at
  before update on public.career_requirements
  for each row execute function public.set_updated_at();

create index if not exists idx_career_requirements_category on public.career_requirements (category, status);

-- ── V1 시드 (스펙 9/25/30/45번 예시 반영) ────────────────────────────────
-- related_qualification_id는 0015_seed.sql의 qualifications 고정 UUID를 그대로 참조한다.
insert into public.career_requirements
  (key, name, category, description, matching_type, related_qualification_id, detection_keywords, preparation_difficulty)
values
  (
    'driving_available',
    '운전 가능',
    'DRIVING',
    '방문/이동 업무를 위해 운전 가능 여부를 요구하거나 우대하는 조건입니다.',
    'DRIVING_FLAG',
    '44444444-4444-4444-4444-0000-0000-0006',
    '["운전 가능","차량운전","운전면허 소지","운전가능자","운전 우대","자차운전"]'::jsonb,
    'MEDIUM'
  ),
  (
    'social_worker_level_2',
    '사회복지사 2급',
    'QUALIFICATION',
    '사회복지시설 근무의 기본 자격으로 가장 많이 요구되는 자격입니다.',
    'QUALIFICATION',
    '44444444-4444-4444-4444-0000-0000-0002',
    '["사회복지사 2급","사회복지사2급","사회복지사 1급","사회복지사1급"]'::jsonb,
    'HIGH'
  ),
  (
    'care_worker_certificate',
    '요양보호사 자격',
    'QUALIFICATION',
    '요양/돌봄 현장에서 직접 돌봄을 제공하기 위해 요구되는 국가자격입니다.',
    'QUALIFICATION',
    '44444444-4444-4444-4444-0000-0000-0001',
    '["요양보호사","요양보호사 자격","요양보호사 자격증"]'::jsonb,
    'HIGH'
  ),
  (
    'computer_document',
    '컴퓨터 활용 · 문서작성',
    'COMPUTER',
    '행정업무 처리를 위한 컴퓨터 활용/문서작성 능력입니다.',
    'SKILL_KEYWORD',
    '44444444-4444-4444-4444-0000-0000-0005',
    '["컴퓨터 활용","문서작성","한글 엑셀","엑셀 가능","오피스 활용","전산업무","컴퓨터활용능력"]'::jsonb,
    'LOW'
  ),
  (
    'long_term_care_experience',
    '장기요양 · 돌봄 실무경험',
    'EXPERIENCE',
    '장기요양/방문요양/돌봄 현장에서의 실무 경험입니다.',
    'EXPERIENCE_TEXT',
    null,
    '["장기요양","요양보호","방문요양","돌봄 경험","재가돌봄","주야간보호","어르신 돌봄"]'::jsonb,
    'MEDIUM'
  ),
  (
    'counseling_skill',
    '상담 · 대인응대',
    'SKILL',
    '이용자/보호자 상담, 민원 대응 등 대인업무 역량입니다.',
    'SKILL_KEYWORD',
    null,
    '["상담","대인응대","고객응대","사례관리","민원 대응","상담업무"]'::jsonb,
    'LOW'
  ),
  (
    'administrative_experience',
    '행정 · 사무업무 경험',
    'EXPERIENCE',
    '문서작성, 행정처리 등 사무행정 경험입니다.',
    'EXPERIENCE_TEXT',
    null,
    '["행정업무","사무업무","사무보조","서류작성","행정처리","문서 작성"]'::jsonb,
    'LOW'
  )
on conflict (key) do nothing;

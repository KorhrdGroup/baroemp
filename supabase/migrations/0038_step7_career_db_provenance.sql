-- 0038_step7_career_db_provenance.sql
-- STEP 7: Resume -> Career DB 역방향 반영을 위한 skills 마스터 카탈로그 + user_skills 매핑,
-- 그리고 기존 user_qualifications에 provenance(source) 컬럼을 추가한다.
-- 기존 0003_tags_and_interests.sql의 qualifications/user_qualifications 구조를 그대로 재사용하고,
-- 이번 마이그레이션은 확장만 한다 (기존 컬럼/데이터 변경 없음).

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  -- 이 스킬 정보가 어디서 왔는지 추적 (RESUME/MANUAL/AI 등). Resume 삭제와 강결합하지 않기 위해
  -- source_resume_id는 참조가 아니라 감사용 텍스트/uuid로만 남긴다 (FK cascade 삭제 금지).
  source text not null default 'MANUAL',
  source_resume_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, skill_id)
);
create index if not exists idx_user_skills_user on public.user_skills (user_id);

-- qualifications 카탈로그는 기존 STEP2 구조를 그대로 재사용한다. user_qualifications에
-- provenance(source)만 추가해, Resume Builder에서 추가한 자격증인지 구분할 수 있게 한다.
alter table public.user_qualifications
  add column if not exists source text not null default 'MANUAL',
  add column if not exists source_resume_id uuid;

comment on column public.user_qualifications.source is 'MANUAL | RESUME | ASSESSMENT 등. Resume Builder에서 추가된 자격은 RESUME로 표시된다.';

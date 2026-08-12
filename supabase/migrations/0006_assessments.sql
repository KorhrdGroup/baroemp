-- 0006_assessments.sql
-- 확장 가능한 검사 구조 (질문/선택지 하드코딩 금지)

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  description text not null default '',
  estimated_minutes integer not null default 5,
  tags jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  prompt text not null,
  question_type text not null default 'single',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  label text not null,
  value text,
  score_weight numeric(8,2) not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

create table if not exists public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  anonymous_id text,
  status text not null default 'started',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions (id) on delete cascade,
  question_id uuid not null references public.assessment_questions (id) on delete cascade,
  option_id uuid references public.assessment_options (id) on delete set null,
  raw_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.assessment_sessions (id) on delete set null,
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  summary text,
  scores jsonb not null default '{}'::jsonb,
  raw_result jsonb not null default '{}'::jsonb,
  recommended_occupations jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

drop trigger if exists trg_assessments_updated_at on public.assessments;
create trigger trg_assessments_updated_at
  before update on public.assessments
  for each row execute function public.set_updated_at();

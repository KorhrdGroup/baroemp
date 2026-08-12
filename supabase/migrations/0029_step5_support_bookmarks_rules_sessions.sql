-- 0029_step5_support_bookmarks_rules_sessions.sql
-- STEP 5: 지원제도 찜, Eligibility Rule Engine, 지원금 진단 세션 테이블.

-- ── 지원제도 찜 (job_bookmarks와 동일한 구조) ────────────────────────────
create table if not exists public.support_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  support_program_id uuid not null references public.support_programs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, support_program_id)
);

-- ── Eligibility Rule Engine ─────────────────────────────────────────────
create table if not exists public.support_program_rules (
  id uuid primary key default gen_random_uuid(),
  support_program_id uuid not null references public.support_programs (id) on delete cascade,
  field text not null,
  operator text not null,
  value jsonb not null default 'null'::jsonb,
  weight numeric(5, 1) not null default 10,
  is_required boolean not null default false,
  rule_type text not null default 'structured' check (rule_type in ('structured', 'raw')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_support_program_rules_updated_at on public.support_program_rules;
create trigger trg_support_program_rules_updated_at
  before update on public.support_program_rules
  for each row execute function public.set_updated_at();

-- ── 지원금 진단(Support Assessment) 세션 ──────────────────────────────────
-- assessment_sessions(STEP3 Career Assessment Engine)과 별개의 단순 고정형 플로우이므로
-- 전용 테이블을 둔다. 원본 답변(answers)이 Career DB의 1차 자료다.
create table if not exists public.support_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  anonymous_id text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_support_assessment_sessions_updated_at on public.support_assessment_sessions;
create trigger trg_support_assessment_sessions_updated_at
  before update on public.support_assessment_sessions
  for each row execute function public.set_updated_at();

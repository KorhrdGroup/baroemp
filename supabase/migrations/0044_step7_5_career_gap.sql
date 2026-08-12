-- 0044_step7_5_career_gap.sql
-- STEP 7.5: Career Gap Result Model (스펙 14번) + 희망 취업처 관심 (스펙 44번).

create table if not exists public.career_gap_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occupation_id uuid references public.occupations (id) on delete set null,
  employment_destination_id uuid references public.employment_destinations (id) on delete set null,
  target_job_id uuid references public.jobs (id) on delete set null,
  market_sample_size integer not null default 0,
  confidence text not null default 'LOW' check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  -- 0~100. 취업 확률이 아니라 내부 Matching Score임을 서비스 레이어/UI에서 항상 명시한다 (스펙 15번).
  readiness_score integer not null default 0,
  current_eligible_job_count integer not null default 0,
  analysis_version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_career_gap_analyses_user on public.career_gap_analyses (user_id, created_at desc);

create table if not exists public.career_gap_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.career_gap_analyses (id) on delete cascade,
  requirement_id uuid not null references public.career_requirements (id) on delete cascade,
  market_required_rate numeric(5, 2) not null default 0,
  market_preferred_rate numeric(5, 2) not null default 0,
  market_mention_rate numeric(5, 2) not null default 0,
  user_status text not null check (user_status in ('SATISFIED', 'NOT_SATISFIED', 'UNKNOWN', 'CHECK_REQUIRED')),
  importance_score numeric(6, 2) not null default 0,
  gap_score numeric(6, 2) not null default 0,
  priority_score numeric(6, 2) not null default 0,
  -- 이 조건 하나를 충족했다고 가정했을 때(Counterfactual) 지원가능 공고 수 (스펙 17번)
  projected_eligible_job_count integer,
  reason text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_career_gap_items_analysis on public.career_gap_items (analysis_id, order_index);

create table if not exists public.user_employment_destination_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occupation_id uuid references public.occupations (id) on delete cascade,
  employment_destination_id uuid references public.employment_destinations (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, occupation_id, employment_destination_id)
);

create index if not exists idx_user_destination_interests_user on public.user_employment_destination_interests (user_id);

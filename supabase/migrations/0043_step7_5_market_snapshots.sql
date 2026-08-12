-- 0043_step7_5_market_snapshots.sql
-- STEP 7.5: Market Requirement Snapshot (스펙 46번).
-- 매 요청마다 전체 job_requirements를 재계산하지 않기 위해 occupation/destination 단위로
-- 계산 결과를 저장해두고, 관리자가 수동 재계산(Recalculate)할 수 있게 한다.

create table if not exists public.market_requirement_snapshots (
  id uuid primary key default gen_random_uuid(),
  occupation_id uuid references public.occupations (id) on delete cascade,
  destination_id uuid references public.employment_destinations (id) on delete cascade,
  period_days integer not null default 90,
  period_start date not null,
  period_end date not null,
  sample_size integer not null default 0,
  confidence text not null default 'LOW' check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  -- [{ requirementId, requiredCount, preferredCount, mentionCount, requiredRate, preferredRate, mentionRate }]
  requirements jsonb not null default '[]'::jsonb,
  is_mock_data boolean not null default false,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_market_snapshots_scope
  on public.market_requirement_snapshots (occupation_id, destination_id, calculated_at desc);
